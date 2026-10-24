/**
 * Security tests for the MCP server, following the OWASP MCP Security Cheat Sheet:
 * https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html
 */

import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMcpServer,
  MCP_ERROR_CODES,
  sanitizeOutput,
  serveStdio,
  UNTRUSTED_CONTENT_NOTICE,
  type JsonRpcResponse,
  type McpServer,
  type McpToolCallEvent,
  type McpToolResult,
} from '../../src/mcp';
import { connection, json, type RecordedRequest } from './helpers';

const HOST = 'blog.example.com';
const ZW = '\u200B'; // zero-width space
const RLO = '\u202E'; // right-to-left override
const author = { id: 'u1', name: 'Ada', username: 'ada', profilePicture: null };

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'hello',
    title: 'Hello',
    url: 'https://blog.example.com/hello',
    excerpt: 'Hi',
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    readTimeInMinutes: 1,
    author,
    tags: [],
    series: null,
    content: { markdown: 'Body', html: '<p>Body</p>', text: 'Body' },
    ...overrides,
  };
}

/** A fetch that answers each operation from `data` and records request headers. */
function routedFetch(data: Record<string, unknown>) {
  const requests: Pick<RecordedRequest, 'headers'>[] = [];
  const fetch = vi.fn((_url: string, init: RequestInit) => {
    requests.push({ headers: new Headers(init.headers) });
    const { query } = JSON.parse(init.body as string) as { query: string };
    const operation = /query (\w+)/.exec(query)?.[1] ?? '';
    return Promise.resolve(json({ data: data[operation] ?? { publication: null } }));
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, mock: fetch, requests };
}

let nextId = 1;
async function call(mcp: McpServer, name: string, args: Record<string, unknown> = {}) {
  const response = await mcp.handleMessage({
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  if (!response || !('result' in response)) throw new Error('Expected a result');
  return response.result as unknown as McpToolResult;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('least privilege (cheat sheet §1)', () => {
  it('never sends an access token, even when HASHNODE_ACCESS_TOKEN is set', async () => {
    vi.stubEnv('HASHNODE_ACCESS_TOKEN', 'secret-token');
    const { fetch, requests } = routedFetch({ PostBySlug: { publication: { post: makePost() } } });
    const mcp = createMcpServer({ host: HOST, fetch });

    await call(mcp, 'get_post', { slug: 'hello' });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.has('authorization')).toBe(false);
  });

  it('exposes only read-only tools', () => {
    const mcp = createMcpServer({ host: HOST, fetch: routedFetch({}).fetch });
    for (const tool of mcp.tools) {
      expect(tool.annotations).toMatchObject({ readOnlyHint: true });
      expect(tool.name).toMatch(/^(get|list|search)_/);
    }
  });
});

describe('tool definition integrity (cheat sheet §2, §9)', () => {
  const mcp = createMcpServer({ host: HOST, fetch: routedFetch({}).fetch });

  it('keeps tool definitions stable; changes must be reviewed in this snapshot', () => {
    expect(mcp.tools).toMatchSnapshot();
  });

  it('uses strict schemas: no extra properties, and bounded, patterned strings', () => {
    const strings: [string, Record<string, unknown>][] = [];
    for (const tool of mcp.tools) {
      expect(tool.inputSchema).toMatchObject({ type: 'object', additionalProperties: false });
      const properties = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
      for (const [name, schema] of Object.entries(properties)) {
        if (schema.type === 'string' && !schema.enum)
          strings.push([`${tool.name}.${name}`, schema]);
        if (schema.type === 'array') {
          expect(schema.maxItems).toBeGreaterThan(0);
          strings.push([`${tool.name}.${name}[]`, schema.items as Record<string, unknown>]);
        }
      }
    }
    expect(strings.length).toBeGreaterThan(10);
    for (const [name, schema] of strings) {
      expect(schema.maxLength, name).toBeGreaterThan(0);
      if (name !== 'search_posts.query') expect(schema.pattern, name).toEqual(expect.any(String));
    }
  });

  it('does not reference other servers or tools outside this server in descriptions', () => {
    const names = new Set(mcp.tools.map((tool) => tool.name));
    for (const tool of mcp.tools) {
      for (const mentioned of tool.description.match(/\b[a-z]+_[a-z_]+\b/g) ?? []) {
        expect(names.has(mentioned), `${tool.name} mentions ${mentioned}`).toBe(true);
      }
    }
  });
});

describe('input validation (cheat sheet §5)', () => {
  const { fetch, mock } = routedFetch({});
  const mcp = createMcpServer({ host: HOST, fetch });

  it.each([
    ['get_post', { slug: '../../etc/passwd' }, 'may only contain'],
    ['get_post', { slug: 'hello world' }, 'may only contain'],
    ['get_post', { slug: `a${'b'.repeat(200)}` }, 'at most 200 characters'],
    ['get_post', { id: 'p1; DROP TABLE posts' }, 'may only contain'],
    ['list_comments', { post_id: '<script>' }, 'may only contain'],
    ['search_posts', { query: 'x'.repeat(201) }, 'at most 200 characters'],
    ['list_posts', { after: 'has space' }, 'may only contain'],
    ['list_posts', { tags: Array.from({ length: 11 }, (_v, i) => `t${i}`) }, 'at most 10'],
    ['list_posts', { tags: ['ok', 'not ok'] }, '`tags[1]` may only contain'],
    ['list_posts', { tags: 'js' }, 'array of at most 10'],
  ])('%s rejects %j before calling Hashnode', async (name, args, message) => {
    mock.mockClear();
    const result = await call(mcp, name, args);
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain(message);
    expect(mock).not.toHaveBeenCalled();
  });

  it('accepts valid slugs, IDs, cursors and queries', async () => {
    const searchable = createMcpServer({ host: HOST, fetch, publicationId: 'pub' });
    const result = await call(searchable, 'search_posts', {
      query: 'what\'s new in "v2"?',
      after: 'eyJpZCI6MX0=',
    });
    expect(result.isError).toBeUndefined();
  });
});

describe('untrusted output (cheat sheet §5, §12)', () => {
  it('strips control, zero-width and bidirectional characters from all output', async () => {
    const hidden = `Hello${ZW}${RLO}\u0007 world\tok\nline`;
    const { fetch } = routedFetch({
      PostBySlug: {
        publication: {
          post: makePost({ title: hidden, content: { markdown: hidden, html: '', text: '' } }),
        },
      },
    });
    const result = await call(createMcpServer({ host: HOST, fetch }), 'get_post', {
      slug: 'hello',
    });
    expect(result.structuredContent).toMatchObject({
      title: 'Hello world\tok\nline',
      content: 'Hello world\tok\nline',
    });
    for (const hiddenCharacter of [ZW, RLO, '\u0007']) {
      expect(result.content[0]!.text).not.toContain(hiddenCharacter);
    }
  });

  it('sanitizes nested values and leaves other types alone', () => {
    expect(
      sanitizeOutput({ a: [`x${ZW}y`, 1, null, true], b: { c: `${RLO}z` }, d: '\uFEFFw' }),
    ).toEqual({ a: ['xy', 1, null, true], b: { c: 'z' }, d: 'w' });
  });

  it('labels every successful result as untrusted data', async () => {
    const { fetch } = routedFetch({ PostBySlug: { publication: { post: makePost() } } });
    const mcp = createMcpServer({ host: HOST, fetch });
    const result = await call(mcp, 'get_post', { slug: 'hello' });
    expect(result.content.map((block) => block.text)).toEqual([
      JSON.stringify(result.structuredContent, null, 2),
      UNTRUSTED_CONTENT_NOTICE,
    ]);

    const init = await mcp.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25' },
    });
    expect(init).toMatchObject({ result: { instructions: expect.stringContaining('untrusted') } });
  });

  it('truncates long post content and flags it', async () => {
    const { fetch } = routedFetch({
      PostBySlug: {
        publication: {
          post: makePost({ content: { markdown: 'x'.repeat(50), html: '', text: '' } }),
        },
      },
    });
    const result = await call(
      createMcpServer({ host: HOST, fetch, maxContentLength: 10 }),
      'get_post',
      {
        slug: 'hello',
      },
    );
    expect(result.structuredContent).toMatchObject({
      content: `${'x'.repeat(10)}\n\n[Truncated]`,
      contentTruncated: true,
    });
  });

  it('truncates long comments and static pages', async () => {
    const long = { markdown: 'y'.repeat(6_000), html: '', text: '' };
    const { fetch } = routedFetch({
      PostComments: {
        post: {
          comments: connection([
            { id: 'c1', dateAdded: '2026-01-01', totalReactions: 0, author, content: long },
          ]),
        },
      },
      StaticPage: {
        publication: {
          staticPage: { id: 's', slug: 'about', title: 'About', hidden: false, content: long },
        },
      },
    });
    const mcp = createMcpServer({ host: HOST, fetch, maxContentLength: 100 });

    const comments = (await call(mcp, 'list_comments', { post_id: 'p1' })).structuredContent as {
      items: { content: string; contentTruncated: boolean }[];
    };
    expect(comments.items[0]!.contentTruncated).toBe(true);
    expect(comments.items[0]!.content.length).toBeLessThan(5_100);

    const page = await call(mcp, 'get_static_page', { slug: 'about' });
    expect(page.structuredContent).toMatchObject({ contentTruncated: true });
  });

  it('rejects an invalid maxContentLength', () => {
    expect(() => createMcpServer({ maxContentLength: 0 })).toThrow(RangeError);
  });
});

describe('audit logging (cheat sheet §10)', () => {
  it('reports every tool call, including failures', async () => {
    const events: McpToolCallEvent[] = [];
    const { fetch } = routedFetch({ PostBySlug: { publication: { post: makePost() } } });
    const mcp = createMcpServer({ host: HOST, fetch, onToolCall: (event) => events.push(event) });

    await call(mcp, 'get_post', { slug: 'hello' });
    await call(mcp, 'get_post', { slug: 'bad slug' });

    expect(events).toEqual([
      expect.objectContaining({ tool: 'get_post', arguments: { slug: 'hello' }, isError: false }),
      expect.objectContaining({
        tool: 'get_post',
        arguments: { slug: '[redacted: 8 characters]' },
        isError: true,
      }),
    ]);
    expect(Date.parse(events[0]!.time)).not.toBeNaN();
    expect(events[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('ignores errors thrown by the logger', async () => {
    const { fetch } = routedFetch({ PostBySlug: { publication: { post: makePost() } } });
    const mcp = createMcpServer({
      host: HOST,
      fetch,
      onToolCall: () => {
        throw new Error('logger down');
      },
    });
    const result = await call(mcp, 'get_post', { slug: 'hello' });
    expect(result.isError).toBeUndefined();
  });
});

describe('stdio limits', () => {
  function collect(output: PassThrough): () => JsonRpcResponse[] {
    const chunks: string[] = [];
    output.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
    return () =>
      chunks
        .join('')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as JsonRpcResponse);
  }

  it('rejects oversized messages without buffering them, then keeps serving', async () => {
    const mcp = createMcpServer({ host: HOST, fetch: routedFetch({}).fetch });
    const input = new PassThrough();
    const output = new PassThrough();
    const responses = collect(output);

    const done = serveStdio(mcp, { input, output, maxMessageLength: 100 });
    input.write(`{"jsonrpc":"2.0","id":1,"method":"ping","params":{"pad":"${'x'.repeat(60)}`);
    input.write(`${'x'.repeat(60)}"}}\n`);
    input.write('{"jsonrpc":"2.0","id":2,"method":"ping"}');
    input.end();
    await done;

    expect(responses()).toEqual([
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: MCP_ERROR_CODES.INVALID_REQUEST, message: 'Message exceeds 100 characters' },
      },
      { jsonrpc: '2.0', id: 2, result: {} },
    ]);
  });

  it('limits the number of requests handled at once', async () => {
    let active = 0;
    let peak = 0;
    const server: McpServer = {
      tools: [],
      handleMessage: async (message) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return { jsonrpc: '2.0', id: (message as { id: number }).id, result: {} };
      },
    };
    const input = new PassThrough();
    const output = new PassThrough();
    const responses = collect(output);

    const done = serveStdio(server, { input, output, maxConcurrentRequests: 2 });
    for (let id = 1; id <= 6; id++) input.write(`{"jsonrpc":"2.0","id":${id},"method":"ping"}\n`);
    input.end();
    await done;

    expect(peak).toBe(2);
    expect(responses()).toHaveLength(6);
  });

  it.each([
    [{ maxMessageLength: 0 }, 'maxMessageLength'],
    [{ maxConcurrentRequests: 1.5 }, 'maxConcurrentRequests'],
  ])('rejects invalid option %j', async (options, name) => {
    const mcp = createMcpServer({ host: HOST, fetch: routedFetch({}).fetch });
    await expect(
      serveStdio(mcp, { input: new PassThrough(), output: new PassThrough(), ...options }),
    ).rejects.toThrow(name);
  });
});

describe('review hardening', () => {
  it('strips Unicode tag characters and U+061C but keeps emoji variation selectors', () => {
    const smuggled = `ok\u{E0041}\u{E0042}\u{E007F}\u061C!`;
    expect(sanitizeOutput(smuggled)).toBe('ok!');
    expect(sanitizeOutput('heart \u2764\uFE0F')).toBe('heart \u2764\uFE0F');
  });

  it('rejects unknown arguments as a tool error before calling Hashnode', async () => {
    const { fetch, mock } = routedFetch({});
    const result = await call(createMcpServer({ host: HOST, fetch }), 'get_post', {
      slug: 'hello',
      sql: 'drop table',
    });
    expect(result).toMatchObject({ isError: true, content: [{ text: 'Unknown argument: sql' }] });
    expect(mock).not.toHaveBeenCalled();
  });

  it('redacts free-text arguments in audit events', async () => {
    const events: McpToolCallEvent[] = [];
    const mcp = createMcpServer({
      host: HOST,
      publicationId: 'pub',
      fetch: routedFetch({}).fetch,
      onToolCall: (event) => events.push(event),
    });
    await call(mcp, 'search_posts', { query: 'my password is hunter2', first: 3 });
    expect(events[0]!.arguments).toEqual({ query: '[redacted: 22 characters]', first: 3 });
    expect(JSON.stringify(events)).not.toContain('hunter2');
  });

  it('stops reading stdin while the queue is full', async () => {
    let started = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const server: McpServer = {
      tools: [],
      handleMessage: async (message) => {
        started++;
        await gate;
        return { jsonrpc: '2.0', id: (message as { id: number }).id, result: {} };
      },
    };
    const input = new PassThrough();
    const output = new PassThrough();
    const lines: string[] = [];
    output.on('data', (chunk: Buffer) => lines.push(...chunk.toString().trim().split('\n')));
    const ping = (id: number) => `{"jsonrpc":"2.0","id":${id},"method":"ping"}\n`;
    const batch = (from: number) => Array.from({ length: 10 }, (_v, i) => ping(from + i)).join('');
    const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

    const done = serveStdio(server, { input, output, maxConcurrentRequests: 2 });
    input.write(batch(1));
    await tick();
    // Two requests run, two wait in the queue, and the reader is paused, so
    // later input stays unread in the stream instead of piling up in memory.
    expect(started).toBe(2);
    input.write(batch(11));
    await tick();
    expect(input.readableLength).toBeGreaterThan(0);
    expect(started).toBe(2);

    release();
    input.end();
    await done;
    expect(lines.filter(Boolean)).toHaveLength(20);
  });
});

describe('audit redaction of invalid input', () => {
  it('logs only values that pass their schema', async () => {
    const events: McpToolCallEvent[] = [];
    const mcp = createMcpServer({
      host: HOST,
      fetch: routedFetch({}).fetch,
      onToolCall: (event) => events.push(event),
    });
    await call(mcp, 'get_post', { slug: 'my password is hunter2', format: 'html', extra: 'x' });
    await call(mcp, 'list_posts', { tags: ['js', 'not a slug'], after: { $ne: 1 }, first: 2 });

    expect(events.map((event) => event.arguments)).toEqual([
      {
        slug: '[redacted: 22 characters]',
        format: 'html',
        '[unknown argument 1]': '[redacted]',
      },
      { tags: ['js', '[redacted: 10 characters]'], after: '[redacted: object]', first: 2 },
    ]);
    expect(JSON.stringify(events)).not.toContain('hunter2');
  });

  it('redacts a non-string query', async () => {
    const events: McpToolCallEvent[] = [];
    const mcp = createMcpServer({
      host: HOST,
      publicationId: 'pub',
      fetch: routedFetch({}).fetch,
      onToolCall: (event) => events.push(event),
    });
    await call(mcp, 'search_posts', { query: { secret: 'value' } });
    expect(events[0]!.arguments).toEqual({ query: '[redacted: 0 characters]' });
  });
});

describe('audit redaction of argument names', () => {
  it('never logs caller-chosen unknown argument names', async () => {
    const events: McpToolCallEvent[] = [];
    const mcp = createMcpServer({
      host: HOST,
      fetch: routedFetch({}).fetch,
      onToolCall: (event) => events.push(event),
    });
    await call(mcp, 'get_post', { slug: 'hello', 'api-key-sk-12345': 1, 'second secret': 2 });
    expect(events[0]!.arguments).toEqual({
      slug: 'hello',
      '[unknown argument 1]': '[redacted]',
      '[unknown argument 2]': '[redacted]',
    });
    expect(JSON.stringify(events)).not.toMatch(/sk-12345|second secret/);
  });
});

describe('prototype-named arguments', () => {
  it('treats __proto__, constructor and toString as unknown arguments', async () => {
    const events: McpToolCallEvent[] = [];
    const mcp = createMcpServer({
      host: HOST,
      fetch: routedFetch({}).fetch,
      onToolCall: (event) => events.push(event),
    });
    // JSON.parse creates an own "__proto__" property, as a real request would.
    const args = JSON.parse(
      '{"slug":"hello","__proto__":424242,"constructor":1,"toString":2}',
    ) as Record<string, unknown>;
    const result = await call(mcp, 'get_post', args);

    expect(result.isError).toBe(true);
    expect(events[0]!.arguments).toEqual({
      slug: 'hello',
      '[unknown argument 1]': '[redacted]',
      '[unknown argument 2]': '[redacted]',
      '[unknown argument 3]': '[redacted]',
    });
    expect(JSON.stringify(events)).not.toContain('424242');
  });
});
