# API reference

- [`HashnodeClient`](#hashnodeclient)
  - [Options](#options)
  - [Request options](#request-options)
  - [Methods](#methods)
- [Request de-duplication](#request-de-duplication)
- [Pagination](#pagination)
- [Errors](#errors)
- [Types](#types)
- [Convenience functions](#convenience-functions)
- [Constants](#constants)
- [Webhooks](#webhooks)

## `HashnodeClient`

```ts
import { HashnodeClient, createHashnodeClient } from '@jowinjohnchemban/hashnode-client';

const hashnode = new HashnodeClient(options);
// or: createHashnodeClient(options)
```

One client talks to one publication. Create it once and reuse it.

### Options

| Option          | Type                       | Environment variable        | Default                                  | Description                                                                                                                                                                            |
| --------------- | -------------------------- | --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `host`          | `string`                   | `HASHNODE_PUBLICATION_HOST` | —                                        | Publication host, e.g. `blog.example.com`. A URL such as `https://blog.example.com/?ref=x` is reduced to its host name. An invalid host throws `TypeError`. Required for most methods. |
| `publicationId` | `string`                   | `HASHNODE_PUBLICATION_ID`   | looked up from `host`                    | Saves one request before the first search.                                                                                                                                             |
| `token`         | `string`                   | `HASHNODE_ACCESS_TOKEN`     | —                                        | Personal access token, sent as `Authorization`. Required for drafts.                                                                                                                   |
| `endpoint`      | `string`                   | `HASHNODE_API_URL`          | `https://gql-beta.hashnode.com/`         | GraphQL endpoint.                                                                                                                                                                      |
| `timeoutMs`     | `number`                   | `HASHNODE_TIMEOUT_MS`       | `15000`                                  | Per-request timeout. An explicit value must be a positive number (`RangeError` otherwise); an invalid `HASHNODE_TIMEOUT_MS` is ignored and the default is used.                        |
| `headers`       | `Record<string, string>`   | —                           | `{}`                                     | Extra headers for every request.                                                                                                                                                       |
| `fetch`         | `typeof fetch`             | —                           | `globalThis.fetch`                       | Custom fetch, e.g. for tests or proxies.                                                                                                                                               |
| `cache`         | `RequestCache`-like string | —                           | not set                                  | Default `fetch` `cache` option.                                                                                                                                                        |
| `next`          | `{ revalidate?, tags? }`   | —                           | not set                                  | Default Next.js data-cache options.                                                                                                                                                    |
| `dedupe`        | `boolean`                  | —                           | `true`, or `false` with a custom `fetch` | Share one API request between identical queries made at the same time. See [Request de-duplication](#request-de-duplication).                                                          |

### Request options

Every method takes an optional last argument that overrides the client defaults for that call:

```ts
interface RequestOptions {
  signal?: AbortSignal; // cancel the request (combined with the timeout)
  cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
  next?: { revalidate?: number | false; tags?: string[] };
}
```

### Methods

`first` defaults to `10` and is capped at `100` (`50` for drafts). A `first` below 1 or not an integer throws a `RangeError`. Empty slugs, IDs and queries throw a `TypeError` before any request is sent.

#### `getPublication(options?)` → `Promise<Publication | null>`

Publication details: title, URL, favicon, SEO and Open Graph data, and the owner. Returns `null` if the host is unknown.

#### `getPublicationId(options?)` → `Promise<string>`

The publication's ID. Uses the `publicationId` option when set; otherwise it is fetched once and cached. A failed lookup is retried on the next call. Throws `NOT_FOUND` if the host is unknown.

#### `getPosts({ first?, after?, tagSlugs? }, options?)` → `Promise<Page<BlogPost>>`

Published posts, newest first. `tagSlugs` limits results to posts with any of the given tags.

#### `iteratePosts({ first?, tagSlugs? }, options?)` → `AsyncGenerator<BlogPost>`

Yields every post, fetching pages of `first` (default 100) as you iterate. Stop early with `break`.

```ts
for await (const post of hashnode.iteratePosts({ tagSlugs: ['javascript'] })) {
  if (post.publishedAt < '2024-01-01') break;
}
```

#### `getPost(slug, options?)` → `Promise<BlogPostDetail | null>`

A post with its content, SEO data and series. Returns `null` if the slug doesn't exist.

#### `getPostById(id, options?)` → `Promise<BlogPostDetail | null>`

Same as `getPost`, by ID. Useful with webhook payloads, which contain IDs.

#### `searchPosts(query, { first?, after?, sortBy? }, options?)` → `Promise<Page<BlogPost>>`

Full-text search within the publication. `sortBy` is `'DATE_PUBLISHED_DESC'` or `'DATE_PUBLISHED_ASC'`; results are ordered by relevance when omitted. Resolves the publication ID first (see `getPublicationId`). `totalDocuments` is always `null`.

#### `getSeriesList({ first?, after? }, options?)` → `Promise<Page<Series>>`

The publication's series.

#### `getSeries(slug, options?)` → `Promise<Series | null>`

A series by slug.

#### `getSeriesPosts(slug, { first?, after? }, options?)` → `Promise<Page<BlogPost>>`

Posts in a series. Returns an empty page if the series doesn't exist.

#### `getStaticPages({ first?, after? }, options?)` → `Promise<Page<StaticPage>>`

Static pages such as "About".

#### `getStaticPage(slug, options?)` → `Promise<StaticPage | null>`

A static page by slug.

#### `getPostComments(postId, { first?, after? }, options?)` → `Promise<Page<Comment>>`

Top-level comments on a post. Returns an empty page if the post doesn't exist.

#### `getRecommendedPublications(options?)` → `Promise<RecommendedPublication[]>`

Publications this publication recommends.

#### `getDrafts({ first?, after? }, options?)` → `Promise<Page<Draft>>`

The token owner's drafts in the publication. Throws `UNAUTHENTICATED` without a token.

#### `request<T>(query, variables?, options?)` → `Promise<T>`

Runs any GraphQL operation against the configured endpoint, with the same auth, timeout and error handling. Use it for fields the typed methods don't cover. The [Hashnode schema](https://github.com/Hashnode/gql-skill) lists what's available.

```ts
const data = await hashnode.request<{ publication: { followersCount: number } }>(
  'query ($host: String!) { publication(host: $host) { followersCount } }',
  { host: 'blog.example.com' },
);
```

#### `host` (getter) → `string | undefined`

The configured publication host.

## Request de-duplication

When several identical queries are in flight at once, the client sends one API request and gives every caller the result. There is no limit on how many callers share it: 100 or 10,000 concurrent `getPost('hello')` calls make a single request to Hashnode. This applies to every method and to `request()`.

It's built into the client, so it works the same everywhere the client runs: Node.js servers (`node:http`, Express, Fastify, Hono), serverless functions, edge runtimes, scripts, the MCP server and Next.js. For example, in a plain Node.js server, a burst of visitors asking for the same post sends one request to Hashnode:

```ts
import { createServer } from 'node:http';
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

const hashnode = new HashnodeClient({ host: 'blog.example.com' });

createServer(async (req, res) => {
  const slug = new URL(req.url ?? '/', 'http://localhost').pathname.slice(1);
  try {
    // Concurrent requests for the same slug share one Hashnode API call.
    const post = slug ? await hashnode.getPost(slug) : null;
    res.writeHead(post ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(post));
  } catch (error) {
    // Always handle errors here: a rejected promise in a request listener is
    // an unhandled rejection, which stops the Node.js process by default.
    console.error(error);
    res.writeHead(502).end();
  }
}).listen(3000);
```

- **Identical** means the same query, variables and `cache`/`next` options. Anything else is sent separately.
- Each caller gets **its own copy** of the result, so changing one doesn't affect the others.
- Only requests that are **in flight** are shared. Once a request finishes, the next call sends a new one; for longer caching, use `cache` or `next`.
- **Aborting** a caller's `signal` rejects only that caller with `ABORTED`. The API request is cancelled once every caller waiting for it has aborted.
- **Failures** are shared too, and the next call retries.
- **Mutations** are never shared.

Set `dedupe: false` to send every call separately.

**Safety.** Sharing never mixes up responses or exposes one user's data to another:

- Requests share only when they would send exactly the same HTTP request, and only within one client instance, whose endpoint, token and headers are fixed. Clients with different tokens never share.
- A custom `fetch` might add per-user credentials, which the client can't see. So with a custom `fetch`, sharing is **off unless you set `dedupe: true`**. Only do that if your `fetch` sends the same credentials for every request.
- Results and errors are copied for each caller, and nothing is stored after a request finishes or every caller aborts.

## Pagination

List methods return a `Page<T>`:

```ts
interface Page<T> {
  items: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalDocuments: number | null; // when Hashnode reports it
}
```

Pass `pageInfo.endCursor` as `after` to get the next page:

```ts
let after: string | null = null;
do {
  const page = await hashnode.getPosts({ first: 50, after });
  handle(page.items);
  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);
```

## Errors

Failures throw `HashnodeError`:

```ts
class HashnodeError extends Error {
  name: 'HashnodeError';
  code: string; // see below
  status: number | undefined; // HTTP status, if any
  errors: GraphQLErrorItem[]; // raw GraphQL errors, if any
  cause: unknown; // underlying error, if any
}
```

Use `isHashnodeError(error)` to narrow `unknown`. It also recognises errors from another copy of the package, for example when an app loads both the ESM and CommonJS builds, where `instanceof` would fail.

| `code`                      | Source            | Meaning                                                                    |
| --------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `FORBIDDEN`                 | Hashnode          | The publication is not on a Pro plan, or the token lacks access.           |
| `NOT_FOUND`                 | Hashnode / client | The item or publication doesn't exist. Lookups turn this into `null`.      |
| `GRAPHQL_VALIDATION_FAILED` | Hashnode          | The query doesn't match the schema (only with custom `request()` queries). |
| `BAD_USER_INPUT`            | Hashnode          | A variable has the wrong type or value.                                    |
| `UNAUTHENTICATED`           | Hashnode / client | A token is required (for example for drafts).                              |
| `CONFIG_ERROR`              | client            | No `host` is configured.                                                   |
| `TIMEOUT`                   | client            | The request took longer than `timeoutMs`.                                  |
| `ABORTED`                   | client            | Your `signal` aborted the request.                                         |
| `NETWORK_ERROR`             | client            | `fetch` failed (DNS, connection, TLS…).                                    |
| `HTTP_ERROR`                | client            | Non-2xx response without GraphQL errors.                                   |
| `INVALID_RESPONSE`          | client            | The response wasn't JSON or had no `data`.                                 |
| `GRAPHQL_ERROR`             | client            | A GraphQL error without a code.                                            |

## Types

All types are exported from the package root. Nullable fields from the schema are typed `T | null`.

| Type                     | Fields                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BlogPost`               | `id`, `cuid`, `slug`, `url`, `title`, `subtitle`, `excerpt`, `publishedAt`, `updatedAt`, `readTimeInMinutes`, `reactionCount`, `responseCount`, `coverImage`, `author`, `tags` |
| `BlogPostDetail`         | `BlogPost` + `content`, `canonicalUrl`, `seo`, `ogMetaData`, `series` (`id`, `name`, `slug`)                                                                                   |
| `Publication`            | `id`, `title`, `displayTitle`, `url`, `canonicalURL`, `favicon`, `followersCount`, `about`, `seo`, `ogMetaData`, `author`                                                      |
| `Series`                 | `id`, `cuid`, `name`, `slug`, `coverImage`, `description`, `author`                                                                                                            |
| `StaticPage`             | `id`, `title`, `slug`, `hidden`, `content`, `seo`, `ogMetaData`                                                                                                                |
| `Comment`                | `id`, `dateAdded`, `totalReactions`, `content`, `author`                                                                                                                       |
| `RecommendedPublication` | `id`, `title`, `displayTitle`, `url`, `favicon`, `author`                                                                                                                      |
| `Draft`                  | `id`, `slug`, `title`, `subtitle`, `updatedAt`, `readTimeInMinutes`, `coverImage`, `tags`, `author`                                                                            |
| `Author`                 | `id`, `name`, `username`, `profilePicture`                                                                                                                                     |
| `Tag`                    | `id`, `name`, `slug`                                                                                                                                                           |
| `Content`                | `html`, `markdown`, `text`                                                                                                                                                     |
| `Seo`                    | `title`, `description`                                                                                                                                                         |
| `OgMetaData`             | `image`                                                                                                                                                                        |
| `CoverImage`             | `url`                                                                                                                                                                          |

Dates are ISO 8601 strings. `excerpt` is Hashnode's `brief`.

Option types: `HashnodeClientOptions`, `RequestOptions`, `FetchCacheOptions`, `NextFetchOptions`, `PaginationOptions`, `ListPostsOptions`, `SearchPostsOptions`, `Page<T>`, `PageInfo`.

## Convenience functions

These use a shared client configured from environment variables. They **never throw**: on failure they log with `console.error` and return `[]` or `null`.

| Function                             | Returns                               |
| ------------------------------------ | ------------------------------------- |
| `getPublication()`                   | `Publication \| null`                 |
| `getBlogPosts(count?)`               | `BlogPost[]`                          |
| `getBlogPostBySlug(slug)`            | `BlogPostDetail \| null`              |
| `searchPosts(query, limit?)`         | `BlogPost[]` (`[]` for a blank query) |
| `getSeriesList(limit?)`              | `Series[]`                            |
| `getSeries(slug)`                    | `Series \| null`                      |
| `getSeriesPosts(seriesSlug, limit?)` | `BlogPost[]`                          |
| `getStaticPages(limit?)`             | `StaticPage[]`                        |
| `getStaticPage(slug)`                | `StaticPage \| null`                  |
| `getPostComments(postId, limit?)`    | `Comment[]`                           |
| `getRecommendedPublications()`       | `RecommendedPublication[]`            |
| `getDrafts(limit?)`                  | `Draft[]`                             |

## Constants

| Constant              | Value                            |
| --------------------- | -------------------------------- |
| `DEFAULT_ENDPOINT`    | `https://gql-beta.hashnode.com/` |
| `DEFAULT_TIMEOUT_MS`  | `15000`                          |
| `DEFAULT_PAGE_SIZE`   | `10`                             |
| `MAX_PAGE_SIZE`       | `100`                            |
| `MAX_DRAFT_PAGE_SIZE` | `50`                             |

## Webhooks

Exported from `@jowinjohnchemban/hashnode-client/webhooks` and re-exported from the root. See the [webhooks guide](WEBHOOKS.md) for usage.

| Export                                                                            | Description                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createWebhookHandler({ secret?, handlers, toleranceSeconds?, onError? })`        | Fetch API `(Request) => Promise<Response>` handler that verifies, parses and dispatches                                                                                   |
| `verifyWebhookSignature({ payload, signature, secret, toleranceSeconds?, now? })` | `Promise<boolean>`                                                                                                                                                        |
| `generateWebhookSignature(payload, secret, timestamp?)`                           | `Promise<string>` header value, for tests                                                                                                                                 |
| `parseWebhookPayload(body)`                                                       | Parses and validates a body; throws `TypeError` if invalid                                                                                                                |
| `dispatchWebhook(payload, handlers)`                                              | Runs the matching handler and `'*'`; resolves `true` if any ran                                                                                                           |
| `parseSignatureHeader(header)`                                                    | `{ timestamp, signatures } \| null`                                                                                                                                       |
| `isPostEvent(type)`, `isStaticPageEvent(type)`                                    | Event type guards                                                                                                                                                         |
| `WEBHOOK_SIGNATURE_HEADER`                                                        | `'x-hashnode-signature'`                                                                                                                                                  |
| `DEFAULT_WEBHOOK_TOLERANCE_SECONDS`                                               | `300`                                                                                                                                                                     |
| `POST_EVENTS`, `STATIC_PAGE_EVENTS`                                               | Event type lists                                                                                                                                                          |
| Types                                                                             | `WebhookPayload`, `WebhookEventType`, `PostEventType`, `StaticPageEventType`, `WebhookHandler`, `WebhookHandlers`, `VerifyWebhookOptions`, `WebhookRequestHandlerOptions` |

## MCP

Exported from `@jowinjohnchemban/hashnode-client/mcp` (Node.js only). See the [MCP guide](MCP.md).

| Export                                    | Description                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createMcpServer(options?)`               | Creates a server; `options` are `HashnodeClientOptions` plus an optional `client`               |
| `serveStdio(server, { input?, output? })` | Serves newline-delimited JSON-RPC over stdio until the input ends                               |
| `server.handleMessage(message)`           | Handles one parsed JSON-RPC message; resolves to the response, or `undefined` for notifications |
| `server.tools`                            | Tool definitions                                                                                |
| `MCP_PROTOCOL_VERSIONS`                   | Supported protocol versions, newest first                                                       |
| `MCP_ERROR_CODES`                         | JSON-RPC and MCP error codes                                                                    |
| Types                                     | `McpServer`, `McpServerOptions`, `McpTool`, `McpToolResult`, `JsonRpcResponse`, `StdioOptions`  |

The `hashnode-mcp` command (`npx -y @jowinjohnchemban/hashnode-client`) runs `serveStdio` with options from `--host` and the `HASHNODE_*` variables.
