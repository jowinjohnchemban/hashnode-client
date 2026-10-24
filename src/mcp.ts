/**
 * Model Context Protocol (MCP) server that gives AI assistants read-only
 * access to a Hashnode publication.
 *
 * Supports MCP protocol versions 2024-11-05 through 2026-07-28: the
 * `initialize` handshake for earlier versions, and stateless requests with
 * `server/discover` for 2026-07-28.
 *
 * @example
 * ```ts
 * import { createMcpServer, serveStdio } from '@jowinjohnchemban/hashnode-client/mcp';
 *
 * await serveStdio(createMcpServer({ host: 'blog.example.com' }));
 * ```
 *
 * @module mcp
 */

import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { HashnodeClient } from './client';
import type { HashnodeClientOptions } from './config';
import { isHashnodeError } from './errors';
import type { BlogPost, Content, Page } from './types';

declare const __PKG_VERSION__: string;

/** Protocol versions this server implements, newest first. */
export const MCP_PROTOCOL_VERSIONS = [
  '2026-07-28',
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

/** Versions negotiated with the `initialize` handshake (before 2026-07-28). */
const HANDSHAKE_VERSIONS: readonly string[] = MCP_PROTOCOL_VERSIONS.slice(1);
const STATELESS_VERSIONS: readonly string[] = MCP_PROTOCOL_VERSIONS.slice(0, 1);

const PROTOCOL_VERSION_META = 'io.modelcontextprotocol/protocolVersion';
const SERVER_INFO_META = 'io.modelcontextprotocol/serverInfo';

/** JSON-RPC and MCP error codes. */
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  UNSUPPORTED_PROTOCOL_VERSION: -32022,
} as const;

type JsonRpcId = string | number | null;

/** A JSON-RPC response sent by the server. */
export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: Record<string, unknown> }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string; data?: unknown } };

/** Describes one MCP tool. */
export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
}

/** Result of a tool call. */
export interface McpToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Options for {@link createMcpServer}. */
export interface McpServerOptions extends HashnodeClientOptions {
  /** Use this client instead of creating one from the other options. */
  client?: HashnodeClient;
}

/** A transport-independent MCP server. */
export interface McpServer {
  /** Tool definitions, in a stable order. */
  readonly tools: readonly McpTool[];
  /**
   * Handles one parsed JSON-RPC message. Resolves to the response, or
   * `undefined` for notifications.
   */
  handleMessage(message: unknown): Promise<JsonRpcResponse | undefined>;
}

const SERVER_INFO = { name: 'hashnode', title: 'Hashnode', version: __PKG_VERSION__ };

/** Error in tool arguments, reported to the model as a tool error. */
class ToolInputError extends Error {}

type Args = Record<string, unknown>;

function optionalString(args: Args, name: string): string | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new ToolInputError(`\`${name}\` must be a non-empty string`);
  }
  return value.trim();
}

function requiredString(args: Args, name: string): string {
  const value = optionalString(args, name);
  if (value === undefined) throw new ToolInputError(`\`${name}\` is required`);
  return value;
}

function optionalInteger(args: Args, name: string, max: number): number | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new ToolInputError(`\`${name}\` must be an integer from 1 to ${max}`);
  }
  return value;
}

function optionalStringArray(args: Args, name: string): string[] | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim())) {
    throw new ToolInputError(`\`${name}\` must be an array of non-empty strings`);
  }
  return value.map((item: string) => item.trim());
}

type ContentFormat = keyof Content;

function contentFormat(args: Args): ContentFormat {
  const value = args.format ?? 'markdown';
  if (value !== 'markdown' && value !== 'html' && value !== 'text') {
    throw new ToolInputError('`format` must be "markdown", "html" or "text"');
  }
  return value;
}

function summarizePost(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    url: post.url,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readTimeInMinutes: post.readTimeInMinutes,
    author: post.author.name,
    tags: post.tags?.map((tag) => tag.slug) ?? [],
  };
}

function pageResult<T, R>(page: Page<T>, map: (item: T) => R) {
  return {
    items: page.items.map(map),
    nextCursor: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
  };
}

const PAGINATION_PROPERTIES = {
  first: { type: 'integer', minimum: 1, maximum: 50, description: 'Page size (default 10).' },
  after: { type: 'string', description: 'The `nextCursor` from a previous page.' },
};

const FORMAT_PROPERTY = {
  type: 'string',
  enum: ['markdown', 'html', 'text'],
  description: 'Content format (default "markdown").',
};

const ANNOTATIONS = { readOnlyHint: true, idempotentHint: true, openWorldHint: true };

function objectSchema(properties: Record<string, unknown>, required: string[] = []) {
  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties: false,
  };
}

interface ToolDefinition extends McpTool {
  run(client: HashnodeClient, args: Args): Promise<Record<string, unknown>>;
}

function defineTools(): ToolDefinition[] {
  return [
    {
      name: 'get_publication',
      title: 'Get publication',
      description: 'Get the blog: title, URL, description and author.',
      inputSchema: objectSchema({}),
      annotations: ANNOTATIONS,
      async run(client) {
        const publication = await client.getPublication();
        if (!publication) throw new ToolInputError('Publication not found');
        return {
          id: publication.id,
          title: publication.displayTitle ?? publication.title,
          url: publication.url,
          description: publication.seo?.description ?? publication.about?.text ?? null,
          author: publication.author.name,
          followersCount: publication.followersCount,
        };
      },
    },
    {
      name: 'list_posts',
      title: 'List posts',
      description:
        'List published posts, newest first. Returns summaries; use get_post for full content.',
      inputSchema: objectSchema({
        ...PAGINATION_PROPERTIES,
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only posts with any of these tag slugs.',
        },
      }),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const page = await client.getPosts({
          first: optionalInteger(args, 'first', 50),
          after: optionalString(args, 'after'),
          tagSlugs: optionalStringArray(args, 'tags'),
        });
        return pageResult(page, summarizePost);
      },
    },
    {
      name: 'get_post',
      title: 'Get post',
      description: 'Get one post with its full content, by slug or by ID.',
      inputSchema: objectSchema({
        slug: { type: 'string', description: 'Post slug.' },
        id: { type: 'string', description: 'Post ID, used when no slug is given.' },
        format: FORMAT_PROPERTY,
      }),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const slug = optionalString(args, 'slug');
        const id = optionalString(args, 'id');
        const format = contentFormat(args);
        if (!slug && !id) throw new ToolInputError('Pass `slug` or `id`');
        const post = slug ? await client.getPost(slug) : await client.getPostById(id ?? '');
        if (!post) throw new ToolInputError(`Post not found: ${slug ?? id ?? ''}`);
        return {
          ...summarizePost(post),
          updatedAt: post.updatedAt,
          series: post.series?.slug ?? null,
          content: post.content[format],
        };
      },
    },
    {
      name: 'search_posts',
      title: 'Search posts',
      description: 'Full-text search of the blog posts.',
      inputSchema: objectSchema(
        { query: { type: 'string', description: 'Search terms.' }, ...PAGINATION_PROPERTIES },
        ['query'],
      ),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const page = await client.searchPosts(requiredString(args, 'query'), {
          first: optionalInteger(args, 'first', 50),
          after: optionalString(args, 'after'),
        });
        return pageResult(page, summarizePost);
      },
    },
    {
      name: 'list_series',
      title: 'List series',
      description: 'List the blog series (collections of related posts).',
      inputSchema: objectSchema(PAGINATION_PROPERTIES),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const page = await client.getSeriesList({
          first: optionalInteger(args, 'first', 50),
          after: optionalString(args, 'after'),
        });
        return pageResult(page, (series) => ({
          id: series.id,
          slug: series.slug,
          name: series.name,
          description: series.description?.text ?? null,
        }));
      },
    },
    {
      name: 'get_series',
      title: 'Get series',
      description: 'Get a series and a page of its posts.',
      inputSchema: objectSchema(
        { slug: { type: 'string', description: 'Series slug.' }, ...PAGINATION_PROPERTIES },
        ['slug'],
      ),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const slug = requiredString(args, 'slug');
        const first = optionalInteger(args, 'first', 50);
        const after = optionalString(args, 'after');
        const [series, posts] = await Promise.all([
          client.getSeries(slug),
          client.getSeriesPosts(slug, { first, after }),
        ]);
        if (!series) throw new ToolInputError(`Series not found: ${slug}`);
        return {
          id: series.id,
          slug: series.slug,
          name: series.name,
          description: series.description?.markdown ?? null,
          posts: pageResult(posts, summarizePost),
        };
      },
    },
    {
      name: 'list_static_pages',
      title: 'List static pages',
      description: 'List static pages such as "About".',
      inputSchema: objectSchema(PAGINATION_PROPERTIES),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const page = await client.getStaticPages({
          first: optionalInteger(args, 'first', 50),
          after: optionalString(args, 'after'),
        });
        return pageResult(page, (staticPage) => ({
          id: staticPage.id,
          slug: staticPage.slug,
          title: staticPage.title,
          hidden: staticPage.hidden,
        }));
      },
    },
    {
      name: 'get_static_page',
      title: 'Get static page',
      description: 'Get a static page with its content.',
      inputSchema: objectSchema(
        { slug: { type: 'string', description: 'Page slug.' }, format: FORMAT_PROPERTY },
        ['slug'],
      ),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const slug = requiredString(args, 'slug');
        const format = contentFormat(args);
        const page = await client.getStaticPage(slug);
        if (!page) throw new ToolInputError(`Static page not found: ${slug}`);
        return { id: page.id, slug: page.slug, title: page.title, content: page.content[format] };
      },
    },
    {
      name: 'list_comments',
      title: 'List comments',
      description: 'List comments on a post, by post ID.',
      inputSchema: objectSchema(
        { post_id: { type: 'string', description: 'Post ID.' }, ...PAGINATION_PROPERTIES },
        ['post_id'],
      ),
      annotations: ANNOTATIONS,
      async run(client, args) {
        const page = await client.getPostComments(requiredString(args, 'post_id'), {
          first: optionalInteger(args, 'first', 50),
          after: optionalString(args, 'after'),
        });
        return pageResult(page, (comment) => ({
          id: comment.id,
          author: comment.author.name,
          dateAdded: comment.dateAdded,
          reactions: comment.totalReactions,
          content: comment.content.markdown,
        }));
      },
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  if (isHashnodeError(error)) {
    const hint =
      error.code === 'FORBIDDEN'
        ? ' (Hashnode serves the API only for publications on a Pro plan)'
        : '';
    return `${error.code}: ${error.message}${hint}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Creates an MCP server backed by a {@link HashnodeClient}. Configuration
 * falls back to the `HASHNODE_*` environment variables like the client.
 */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const { client: providedClient, ...clientOptions } = options;
  const definitions = defineTools();
  const byName = new Map(definitions.map((tool) => [tool.name, tool]));
  const tools: McpTool[] = definitions.map(
    ({ name, title, description, inputSchema, annotations }) => ({
      name,
      title,
      description,
      inputSchema,
      annotations,
    }),
  );

  let client: HashnodeClient | undefined = providedClient;
  let clientError: unknown;
  const getClient = (): HashnodeClient => {
    if (client) return client;
    if (clientError === undefined) {
      try {
        client = new HashnodeClient(clientOptions);
        return client;
      } catch (error) {
        clientError = error;
      }
    }
    throw clientError;
  };

  const instructions = (): string => {
    let host: string | undefined;
    try {
      host = getClient().host;
    } catch {
      // Reported by the tools themselves.
    }
    return [
      `Read-only access to the Hashnode blog${host ? ` at ${host}` : ''}.`,
      'Use list_posts or search_posts to find posts, then get_post for full content.',
      'List results are paginated: pass `nextCursor` as `after` to get the next page.',
    ].join(' ');
  };

  async function callTool(params: Record<string, unknown>): Promise<McpToolResult> {
    const tool = typeof params.name === 'string' ? byName.get(params.name) : undefined;
    if (!tool)
      throw new RpcError(MCP_ERROR_CODES.INVALID_PARAMS, `Unknown tool: ${String(params.name)}`);
    const args = params.arguments ?? {};
    if (!isRecord(args)) {
      throw new RpcError(MCP_ERROR_CODES.INVALID_PARAMS, '`arguments` must be an object');
    }
    try {
      const result = await tool.run(getClient(), args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      return { content: [{ type: 'text', text: errorMessage(error) }], isError: true };
    }
  }

  async function handleRequest(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const meta = isRecord(params._meta) ? params._meta : {};
    const requested = meta[PROTOCOL_VERSION_META];
    const stateless = typeof requested === 'string';

    if (stateless && !STATELESS_VERSIONS.includes(requested)) {
      throw new RpcError(
        MCP_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
        `Unsupported protocol version: ${requested}`,
        { supported: [...MCP_PROTOCOL_VERSIONS], requested },
      );
    }

    // 2026-07-28 results carry resultType and the server identity.
    const finish = (result: Record<string, unknown>) =>
      stateless
        ? { ...result, resultType: 'complete', _meta: { [SERVER_INFO_META]: SERVER_INFO } }
        : result;

    switch (method) {
      case 'initialize': {
        const version =
          typeof params.protocolVersion === 'string' &&
          HANDSHAKE_VERSIONS.includes(params.protocolVersion)
            ? params.protocolVersion
            : HANDSHAKE_VERSIONS[0];
        return {
          protocolVersion: version,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: instructions(),
        };
      }
      case 'server/discover':
        return {
          ...finish({
            supportedVersions: [...MCP_PROTOCOL_VERSIONS],
            capabilities: { tools: {} },
            instructions: instructions(),
          }),
          ttlMs: 3_600_000,
          cacheScope: 'public',
        };
      case 'ping':
        return {};
      case 'tools/list':
        return stateless
          ? { ...finish({ tools }), ttlMs: 3_600_000, cacheScope: 'public' }
          : { tools };
      case 'tools/call':
        return finish({ ...(await callTool(params)) });
      default:
        throw new RpcError(MCP_ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  async function handleMessage(message: unknown): Promise<JsonRpcResponse | undefined> {
    if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      const id = isRecord(message) ? toId(message.id) : null;
      return rpcError(id, MCP_ERROR_CODES.INVALID_REQUEST, 'Invalid JSON-RPC request');
    }
    // Notifications (no id) never get a response.
    if (!('id' in message)) return undefined;

    const id = toId(message.id);
    const params = message.params ?? {};
    if (!isRecord(params)) {
      return rpcError(id, MCP_ERROR_CODES.INVALID_PARAMS, '`params` must be an object');
    }
    try {
      return { jsonrpc: '2.0', id, result: await handleRequest(message.method, params) };
    } catch (error) {
      if (error instanceof RpcError) return rpcError(id, error.code, error.message, error.data);
      return rpcError(id, MCP_ERROR_CODES.INTERNAL_ERROR, errorMessage(error));
    }
  }

  return { tools, handleMessage };
}

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

function toId(value: unknown): JsonRpcId {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data !== undefined && { data }) },
  };
}

/** Streams for {@link serveStdio}. Default to the process's stdin and stdout. */
export interface StdioOptions {
  input?: Readable;
  output?: Writable;
}

/**
 * Serves an MCP server over newline-delimited JSON-RPC on stdin and stdout.
 * Resolves when the input ends and all pending requests have been answered.
 * Only protocol messages are written to the output; nothing else is logged.
 */
export async function serveStdio(server: McpServer, options: StdioOptions = {}): Promise<void> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const pending = new Set<Promise<void>>();

  const send = (response: JsonRpcResponse) => {
    output.write(`${JSON.stringify(response)}\n`);
  };

  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      send(rpcError(null, MCP_ERROR_CODES.PARSE_ERROR, 'Parse error'));
      continue;
    }
    const task = server.handleMessage(message).then((response) => {
      if (response) send(response);
    });
    pending.add(task);
    void task.finally(() => pending.delete(task));
  }
  await Promise.all(pending);
}
