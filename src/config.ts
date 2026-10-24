/**
 * Client configuration and environment-variable resolution.
 *
 * @module config
 */

/** Default Hashnode GraphQL endpoint. */
export const DEFAULT_ENDPOINT = 'https://gql-beta.hashnode.com/';

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/** Default page size for list queries. */
export const DEFAULT_PAGE_SIZE = 10;

/** Largest page size Hashnode accepts for most connections. */
export const MAX_PAGE_SIZE = 100;

/** Largest page size Hashnode accepts for draft connections. */
export const MAX_DRAFT_PAGE_SIZE = 50;

/**
 * Next.js data-cache options, forwarded as `fetch(url, { next })`.
 * Ignored outside Next.js.
 */
export interface NextFetchOptions {
  /** Seconds to cache the response, or `false` to cache indefinitely. */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation with `revalidateTag()`. */
  tags?: string[];
}

/** Options shared by the client and individual requests. */
export interface FetchCacheOptions {
  /** Forwarded as `fetch(url, { cache })`, e.g. `'no-store'` or `'force-cache'`. */
  cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
  /** Next.js data-cache options. */
  next?: NextFetchOptions;
}

/** Options for {@link HashnodeClient}. Every field falls back to an environment variable. */
export interface HashnodeClientOptions extends FetchCacheOptions {
  /** Publication host, e.g. `blog.example.com`. Env: `HASHNODE_PUBLICATION_HOST`. */
  host?: string;
  /** Publication ID. Resolved from `host` on first use when omitted. Env: `HASHNODE_PUBLICATION_ID`. */
  publicationId?: string;
  /** Personal access token; required for drafts. Env: `HASHNODE_ACCESS_TOKEN`. */
  token?: string;
  /** GraphQL endpoint. Env: `HASHNODE_API_URL`. */
  endpoint?: string;
  /** Request timeout in milliseconds. Env: `HASHNODE_TIMEOUT_MS`. */
  timeoutMs?: number;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Fully resolved client configuration. */
export interface ResolvedConfig extends FetchCacheOptions {
  host: string | undefined;
  publicationId: string | undefined;
  token: string | undefined;
  endpoint: string;
  timeoutMs: number;
  headers: Record<string, string>;
  fetch: typeof fetch;
}

function env(name: string): string | undefined {
  // `process` is absent in some edge and browser runtimes.
  const value = typeof process === 'undefined' ? undefined : process.env[name]?.trim();
  return value === '' ? undefined : value;
}

function parseTimeout(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Accepts a host written as a URL (`https://blog.example.com/`) and returns the
 * bare, lower-case host name Hashnode expects (`blog.example.com`).
 */
export function normalizeHost(host: string | undefined): string | undefined {
  const value = host
    ?.trim()
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  return value === '' ? undefined : value;
}

/** Merges explicit options with environment variables and defaults. */
export function resolveConfig(options: HashnodeClientOptions = {}): ResolvedConfig {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('No fetch implementation available. Pass one via the `fetch` option.');
  }
  if (
    options.timeoutMs !== undefined &&
    !(Number.isFinite(options.timeoutMs) && options.timeoutMs > 0)
  ) {
    throw new RangeError(
      `\`timeoutMs\` must be a positive number, received ${String(options.timeoutMs)}`,
    );
  }

  return {
    host: normalizeHost(options.host ?? env('HASHNODE_PUBLICATION_HOST')),
    publicationId: options.publicationId ?? env('HASHNODE_PUBLICATION_ID'),
    token: options.token ?? env('HASHNODE_ACCESS_TOKEN'),
    endpoint: options.endpoint ?? env('HASHNODE_API_URL') ?? DEFAULT_ENDPOINT,
    timeoutMs: options.timeoutMs ?? parseTimeout(env('HASHNODE_TIMEOUT_MS')) ?? DEFAULT_TIMEOUT_MS,
    headers: options.headers ?? {},
    fetch: fetchImpl,
    cache: options.cache,
    next: options.next,
  };
}
