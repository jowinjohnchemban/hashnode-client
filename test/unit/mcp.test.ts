import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { HashnodeClient } from '../../src';
import {
  createMcpServer,
  MCP_ERROR_CODES,
  MCP_PROTOCOL_VERSIONS,
  serveStdio,
  type JsonRpcResponse,
  type McpToolResult,
} from '../../src/mcp';
import { connection, json } from './helpers';

const HOST = 'blog.example.com';
const author = { id: 'u1', name: 'Ada', username: 'ada', profilePicture: null };
const post = {
  id: 'p1',
  slug: 'hello',
  title: 'Hello',
  url: 'https://blog.example.com/hello',
  excerpt: 'Hi',
  publishedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  readTimeInMinutes: 3,
  author,
  tags: [{ id: 't1', name: 'JS', slug: 'js' }],
  content: { markdown: '# Hello', html: '<h1>Hello</h1>', text: 'Hello' },
  series: { id: 's1', name: 'Intro', slug: 'intro' },
};
const series = {
  id: 's1',
  slug: 'intro',
  name: 'Intro',
  description: { text: 'Start here', markdown: 'Start *here*', html: '' },
};
const staticPage = {
  id: 'sp1',
  slug: 'about',
  title: 'About',
  hidden: false,
  content: { markdown: 'About me', html: '<p>About me</p>', text: 'About me' },
};
const comment = {
  id: 'c1',
  dateAdded: '2026-01-02T00:00:00.000Z',
  totalReactions: 2,
  author,
  content: { markdown: 'Nice', html: '', text: 'Nice' },
};

const DATA: Record<string, unknown> = {
  Publication: {
    publication: {
      id: 'pub',
      title: 'Blog',
      displayTitle: null,
      url: 'https://blog.example.com',
      seo: { title: null, description: 'A blog' },
      about: null,
      author,
      followersCount: 5,
    },
  },
  Posts: { publication: { posts: connection([post], true, 'cursor-2') } },
  PostBySlug: { publication: { post } },
  PostById: { post },
  SearchPosts: { searchPostsOfPublication: connection([post]) },
  SeriesList: { publication: { seriesList: connection([series]) } },
  Series: { publication: { series } },
  SeriesPosts: { publication: { series: { posts: connection([post]) } } },
  StaticPages: { publication: { staticPages: connection([staticPage]) } },
  StaticPage: { publication: { staticPage } },
  PostComments: { post: { comments: connection([comment]) } },
};

/** A fetch that answers each GraphQL operation from `data`, recording the variables. */
function routedFetch(data: Record<string, unknown> = DATA) {
  const calls: { operation: string; variables: Record<string, unknown> }[] = [];
  const fetch = vi.fn((_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as {
      query: string;
      variables: Record<string, unknown>;
    };
    const operation = /query (\w+)/.exec(body.query)?.[1] ?? '';
    calls.push({ operation, variables: body.variables });
    if (!(operation in data))
      return Promise.resolve(json({ data: { publication: null, post: null } }));
    const value = data[operation];
    return Promise.resolve(value instanceof Response ? value : json({ data: value }));
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

function server(data?: Record<string, unknown>) {
  const { fetch, calls } = routedFetch(data);
  return { mcp: createMcpServer({ client: new HashnodeClient({ host: HOST, fetch }) }), calls };
}

let nextId = 1;
async function request(
  mcp: ReturnType<typeof createMcpServer>,
  method: string,
  params?: Record<string, unknown>,
) {
  const response = await mcp.handleMessage({ jsonrpc: '2.0', id: nextId++, method, params });
  if (!response) throw new Error('Expected a response');
  return response;
}

function result(response: JsonRpcResponse): Record<string, unknown> {
  if (!('result' in response)) throw new Error(`Unexpected error: ${response.error.message}`);
  return response.result;
}

async function callTool(
  mcp: ReturnType<typeof createMcpServer>,
  name: string,
  args?: Record<string, unknown>,
) {
  return result(
    await request(mcp, 'tools/call', { name, arguments: args }),
  ) as unknown as McpToolResult;
}

describe('MCP lifecycle', () => {
  it('negotiates a requested handshake version', async () => {
    const { mcp } = server();
    const init = result(
      await request(mcp, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      }),
    );
    expect(init).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'hashnode', version: '0.0.0-test' },
    });
    expect(init.instructions).toContain(HOST);
  });

  it('answers an unknown handshake version with the latest it supports', async () => {
    const { mcp } = server();
    const init = result(await request(mcp, 'initialize', { protocolVersion: '1999-01-01' }));
    expect(init.protocolVersion).toBe('2025-11-25');
  });

  it('ignores notifications', async () => {
    const { mcp } = server();
    await expect(
      mcp.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ).resolves.toBeUndefined();
  });

  it('answers ping', async () => {
    const { mcp } = server();
    expect(result(await request(mcp, 'ping'))).toEqual({});
  });

  it('supports stateless 2026-07-28 requests with server/discover', async () => {
    const { mcp } = server();
    const meta = { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } };

    const discover = result(await request(mcp, 'server/discover', meta));
    expect(discover).toMatchObject({
      resultType: 'complete',
      supportedVersions: [...MCP_PROTOCOL_VERSIONS],
      capabilities: { tools: {} },
      cacheScope: 'public',
      _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'hashnode' } },
    });
    expect(discover.ttlMs).toBeGreaterThan(0);

    const list = result(await request(mcp, 'tools/list', meta));
    expect(list).toMatchObject({ resultType: 'complete', cacheScope: 'public' });
    expect(list.tools).toHaveLength(9);

    const call = result(
      await request(mcp, 'tools/call', { ...meta, name: 'get_post', arguments: { slug: 'hello' } }),
    );
    expect(call.resultType).toBe('complete');
  });

  it('rejects an unsupported stateless protocol version', async () => {
    const { mcp } = server();
    const response = await request(mcp, 'tools/list', {
      _meta: { 'io.modelcontextprotocol/protocolVersion': '2099-01-01' },
    });
    expect(response).toMatchObject({
      error: {
        code: MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
        data: { supported: [...MCP_PROTOCOL_VERSIONS], requested: '2099-01-01' },
      },
    });
  });
});

describe('JSON-RPC errors', () => {
  it.each([
    ['a non-object', 'nope', null],
    ['a wrong version', { jsonrpc: '1.0', id: 1, method: 'ping' }, 1],
    ['a missing method', { jsonrpc: '2.0', id: 'a' }, 'a'],
    ['a batch', [{ jsonrpc: '2.0', id: 1, method: 'ping' }], null],
  ])('rejects %s', async (_case, message, id) => {
    const { mcp } = server();
    await expect(mcp.handleMessage(message)).resolves.toMatchObject({
      id,
      error: { code: MCP_ERROR_CODES.INVALID_REQUEST },
    });
  });

  it('rejects non-object params', async () => {
    const { mcp } = server();
    await expect(
      mcp.handleMessage({ jsonrpc: '2.0', id: 1, method: 'ping', params: [] }),
    ).resolves.toMatchObject({ error: { code: MCP_ERROR_CODES.INVALID_PARAMS } });
  });

  it('reports unknown methods', async () => {
    const { mcp } = server();
    await expect(request(mcp, 'resources/list')).resolves.toMatchObject({
      error: { code: MCP_ERROR_CODES.METHOD_NOT_FOUND },
    });
  });

  it('reports unknown tools and bad arguments as invalid params', async () => {
    const { mcp } = server();
    await expect(request(mcp, 'tools/call', { name: 'delete_post' })).resolves.toMatchObject({
      error: { code: MCP_ERROR_CODES.INVALID_PARAMS },
    });
    await expect(
      request(mcp, 'tools/call', { name: 'get_post', arguments: 'slug' }),
    ).resolves.toMatchObject({ error: { code: MCP_ERROR_CODES.INVALID_PARAMS } });
  });
});

describe('tools', () => {
  it('lists read-only tools with schemas in a stable order', async () => {
    const { mcp } = server();
    const { tools } = result(await request(mcp, 'tools/list')) as {
      tools: { name: string; inputSchema: { type: string }; annotations: object }[];
    };
    expect(tools.map((tool) => tool.name)).toEqual([
      'get_publication',
      'list_posts',
      'get_post',
      'search_posts',
      'list_series',
      'get_series',
      'list_static_pages',
      'get_static_page',
      'list_comments',
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.annotations).toMatchObject({ readOnlyHint: true });
    }
    expect(mcp.tools).toEqual(tools);
  });

  it('get_publication', async () => {
    const { mcp } = server();
    const res = await callTool(mcp, 'get_publication');
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({
      id: 'pub',
      title: 'Blog',
      description: 'A blog',
    });
    expect(JSON.parse(res.content[0]!.text)).toEqual(res.structuredContent);
  });

  it('list_posts passes paging and tags, and returns summaries with a cursor', async () => {
    const { mcp, calls } = server();
    const res = await callTool(mcp, 'list_posts', { first: 5, after: 'c1', tags: ['js'] });
    expect(calls[0]!.variables).toMatchObject({
      first: 5,
      after: 'c1',
      filter: { tagSlugs: ['js'] },
    });
    expect(res.structuredContent).toEqual({
      items: [
        {
          id: 'p1',
          slug: 'hello',
          title: 'Hello',
          url: 'https://blog.example.com/hello',
          excerpt: 'Hi',
          publishedAt: '2026-01-01T00:00:00.000Z',
          readTimeInMinutes: 3,
          author: 'Ada',
          tags: ['js'],
        },
      ],
      nextCursor: 'cursor-2',
    });
  });

  it('get_post by slug or id, in the requested format', async () => {
    const { mcp, calls } = server();
    const bySlug = await callTool(mcp, 'get_post', { slug: 'hello' });
    expect(bySlug.structuredContent).toMatchObject({ content: '# Hello', series: 'intro' });

    const byId = await callTool(mcp, 'get_post', { id: 'p1', format: 'html' });
    expect(byId.structuredContent).toMatchObject({ content: '<h1>Hello</h1>' });
    expect(calls.map((call) => call.operation)).toEqual(['PostBySlug', 'PostById']);
  });

  it('search_posts, series, static pages and comments', async () => {
    const { mcp } = server();
    const search = await callTool(mcp, 'search_posts', { query: 'hello' });
    expect(search.structuredContent).toMatchObject({ items: [{ id: 'p1' }], nextCursor: null });

    const seriesList = await callTool(mcp, 'list_series');
    expect(seriesList.structuredContent).toMatchObject({
      items: [{ slug: 'intro', description: 'Start here' }],
    });

    const one = await callTool(mcp, 'get_series', { slug: 'intro', first: 2 });
    expect(one.structuredContent).toMatchObject({
      name: 'Intro',
      description: 'Start *here*',
      posts: { items: [{ id: 'p1' }] },
    });

    const pages = await callTool(mcp, 'list_static_pages');
    expect(pages.structuredContent).toMatchObject({ items: [{ slug: 'about', hidden: false }] });

    const page = await callTool(mcp, 'get_static_page', { slug: 'about', format: 'text' });
    expect(page.structuredContent).toMatchObject({ content: 'About me' });

    const comments = await callTool(mcp, 'list_comments', { post_id: 'p1' });
    expect(comments.structuredContent).toMatchObject({
      items: [{ author: 'Ada', reactions: 2, content: 'Nice' }],
    });
  });

  it.each([
    ['get_post', {}, 'Pass `slug` or `id`'],
    ['get_post', { slug: 'missing' }, 'Post not found'],
    ['get_post', { slug: 'hello', format: 'pdf' }, '`format`'],
    ['search_posts', {}, '`query` is required'],
    ['search_posts', { query: '  ' }, 'non-empty string'],
    ['list_posts', { first: 0 }, 'integer from 1 to 50'],
    ['list_posts', { first: 51 }, 'integer from 1 to 50'],
    ['list_posts', { tags: [''] }, 'array of non-empty strings'],
    ['get_series', { slug: 'missing' }, 'Series not found'],
    ['get_static_page', { slug: 'missing' }, 'Static page not found'],
  ])('%s %j reports a tool error', async (name, args, message) => {
    const { mcp } = server({
      ...DATA,
      PostBySlug: { publication: { post: null } },
      ...missingFor(args),
    });
    const res = await callTool(mcp, name, args);
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain(message);
  });

  it('explains the Pro plan requirement on FORBIDDEN', async () => {
    const forbidden = json({
      errors: [{ message: 'No Pro plan', extensions: { code: 'FORBIDDEN' } }],
      data: null,
    });
    const { mcp } = server({ Publication: forbidden });
    const res = await callTool(mcp, 'get_publication');
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/^FORBIDDEN: No Pro plan .*Pro plan/);
  });

  it('reports a missing publication', async () => {
    const { mcp } = server({ Publication: { publication: null } });
    const res = await callTool(mcp, 'get_publication');
    expect(res).toMatchObject({ isError: true, content: [{ text: 'Publication not found' }] });
  });

  it('reports configuration errors from tools, not at startup', async () => {
    const mcp = createMcpServer({ host: 'not a host', fetch: routedFetch().fetch });
    const init = result(await request(mcp, 'initialize', { protocolVersion: '2025-11-25' }));
    expect(init.instructions).toMatch(/^Read-only access to the Hashnode blog\./);

    const first = await callTool(mcp, 'get_publication');
    const second = await callTool(mcp, 'list_posts');
    expect(first).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining('Invalid publication host') }],
    });
    expect(second.isError).toBe(true);
  });

  it('treats a malformed _meta as a handshake-era request', async () => {
    const mcp = createMcpServer({
      client: new HashnodeClient({ host: HOST, fetch: routedFetch().fetch }),
    });
    const handled = await mcp.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_post', arguments: { slug: 'hello' }, _meta: 7 },
    });
    expect(handled).toMatchObject({ result: { structuredContent: { id: 'p1' } } });
  });
});

/** Makes lookups for "missing" slugs return null. */
function missingFor(args: Record<string, unknown>): Record<string, unknown> {
  if (args.slug !== 'missing') return {};
  return {
    PostBySlug: { publication: { post: null } },
    Series: { publication: { series: null } },
    StaticPage: { publication: { staticPage: null } },
  };
}

describe('serveStdio', () => {
  it('answers newline-delimited requests and ignores notifications and blank lines', async () => {
    const { mcp } = server();
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));

    const done = serveStdio(mcp, { input, output });
    input.write(
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}\n',
    );
    input.write('\n');
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\r\n');
    input.write('not json\n');
    input.write('{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n');
    input.end();
    await done;

    const responses = chunks
      .join('')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as JsonRpcResponse);
    expect(responses).toHaveLength(3);
    expect(responses).toContainEqual(
      expect.objectContaining({ id: null, error: expect.objectContaining({ code: -32700 }) }),
    );
    expect(responses.find((r) => r.id === 1)).toMatchObject({
      result: { protocolVersion: '2025-11-25' },
    });
    expect(responses.find((r) => r.id === 2)).toMatchObject({
      result: { tools: expect.any(Array) },
    });
  });
});
