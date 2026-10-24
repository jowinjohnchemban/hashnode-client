# @jowinjohnchemban/hashnode-client

[![npm](https://img.shields.io/npm/v/@jowinjohnchemban/hashnode-client)](https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client)
[![CI](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/ci.yml/badge.svg)](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/codeql.yml/badge.svg)](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A typed, zero-dependency client for the [Hashnode](https://hashnode.com) GraphQL API, for using Hashnode as a headless CMS from Node.js, Next.js and edge runtimes. Includes webhook signature verification.

- Typed methods for posts, search, series, static pages, comments, recommendations and drafts
- Cursor pagination with an async iterator for walking every post
- Typed `HashnodeError` with the server's error code, request timeouts and `AbortSignal` support
- Next.js data-cache options (`revalidate`, `tags`) per client or per request
- Webhook verification with Web Crypto, plus a ready-made Fetch API route handler
- ESM and CommonJS builds, no runtime dependencies

> [!IMPORTANT]
> Since May 2026 Hashnode only serves API requests for publications on a **Pro plan**. Requests for other publications fail with `HashnodeError` code `FORBIDDEN`. See the [Hashnode announcement](https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access).

## Install

```sh
pnpm add @jowinjohnchemban/hashnode-client
# or: npm install / yarn add / bun add
```

Requires Node.js 22 or later, or any runtime with `fetch` and Web Crypto (Deno, Bun, Cloudflare Workers, Vercel Edge).

## Quick start

```ts
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

const hashnode = new HashnodeClient({ host: 'blog.example.com' });

const { items: posts, pageInfo } = await hashnode.getPosts({ first: 10 });
const post = await hashnode.getPost('my-first-post'); // null if it doesn't exist
```

Every option can also come from the environment (see [`.env.example`](.env.example)):

| Option          | Environment variable        | Default                          |
| --------------- | --------------------------- | -------------------------------- |
| `host`          | `HASHNODE_PUBLICATION_HOST` | —                                |
| `publicationId` | `HASHNODE_PUBLICATION_ID`   | looked up from `host` on demand  |
| `token`         | `HASHNODE_ACCESS_TOKEN`     | — (needed for drafts)            |
| `endpoint`      | `HASHNODE_API_URL`          | `https://gql-beta.hashnode.com/` |
| `timeoutMs`     | `HASHNODE_TIMEOUT_MS`       | `15000`                          |
| `headers`       | —                           | `{}`                             |
| `fetch`         | —                           | `globalThis.fetch`               |
| `cache`, `next` | —                           | not set                          |

## API

All methods return promises and throw `HashnodeError` on failure. Lookups by slug or ID return `null` when the item does not exist. List methods return a `Page<T>`:

```ts
interface Page<T> {
  items: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalDocuments: number | null;
}
```

| Method                                            | Returns                               |
| ------------------------------------------------- | ------------------------------------- |
| `getPublication()`                                | `Publication \| null`                 |
| `getPublicationId()`                              | `string`                              |
| `getPosts({ first?, after?, tagSlugs? })`         | `Page<BlogPost>`                      |
| `iteratePosts({ first?, tagSlugs? })`             | `AsyncGenerator<BlogPost>`            |
| `getPost(slug)`                                   | `BlogPostDetail \| null`              |
| `getPostById(id)`                                 | `BlogPostDetail \| null`              |
| `searchPosts(query, { first?, after?, sortBy? })` | `Page<BlogPost>`                      |
| `getSeriesList({ first?, after? })`               | `Page<Series>`                        |
| `getSeries(slug)`                                 | `Series \| null`                      |
| `getSeriesPosts(slug, { first?, after? })`        | `Page<BlogPost>`                      |
| `getStaticPages({ first?, after? })`              | `Page<StaticPage>`                    |
| `getStaticPage(slug)`                             | `StaticPage \| null`                  |
| `getPostComments(postId, { first?, after? })`     | `Page<Comment>`                       |
| `getRecommendedPublications()`                    | `RecommendedPublication[]`            |
| `getDrafts({ first?, after? })`                   | `Page<Draft>` (requires `token`)      |
| `request(query, variables?, options?)`            | raw GraphQL `data` for custom queries |

`first` defaults to 10 and is capped at Hashnode's limit (100, or 50 for drafts). Every method also accepts per-request options as its last argument: `{ signal?, cache?, next? }`.

### Pagination

```ts
let after: string | null = null;
do {
  const page = await hashnode.getPosts({ first: 50, after });
  render(page.items);
  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);

// or let the client do it
for await (const post of hashnode.iteratePosts()) console.log(post.slug);
```

### Error handling

```ts
import { isHashnodeError } from '@jowinjohnchemban/hashnode-client';

try {
  await hashnode.getPosts();
} catch (error) {
  if (isHashnodeError(error)) {
    error.code; // 'FORBIDDEN', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR', 'CONFIG_ERROR', ...
    error.status; // HTTP status, if any
    error.errors; // raw GraphQL errors, if any
  }
}
```

### Next.js caching

The client sets no cache options by default. Pass Next.js [`fetch` options](https://nextjs.org/docs/app/api-reference/functions/fetch) once on the client or override them per request:

```ts
export const hashnode = new HashnodeClient({
  host: 'blog.example.com',
  next: { revalidate: 300, tags: ['hashnode'] },
});

await hashnode.getPost(slug, { next: { revalidate: 60, tags: ['hashnode', `post:${slug}`] } });
await hashnode.searchPosts(query, {}, { cache: 'no-store' });
```

### Convenience functions

For simple scripts, these functions use a shared client configured from environment variables. They **never throw**: errors are logged with `console.error` and an empty result (`[]` or `null`) is returned.

`getPublication`, `getBlogPosts(count?)`, `getBlogPostBySlug(slug)`, `searchPosts(query, limit?)`, `getSeriesList(limit?)`, `getSeries(slug)`, `getSeriesPosts(slug, limit?)`, `getStaticPages(limit?)`, `getStaticPage(slug)`, `getPostComments(postId, limit?)`, `getRecommendedPublications()`, `getDrafts(limit?)`.

Use `HashnodeClient` when you need errors or pagination.

## Webhooks

Import from `@jowinjohnchemban/hashnode-client/webhooks` (also re-exported from the main entry). The module only uses Web Crypto, so it runs on edge runtimes.

Next.js App Router route handler. The secret is read from `HASHNODE_WEBHOOK_SECRET` unless you pass `secret`:

```ts
// app/api/hashnode/route.ts
import { revalidateTag } from 'next/cache';
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  handlers: {
    post_published: () => revalidateTag('hashnode'),
    post_updated: ({ data }) => revalidateTag(`post:${data.post?.id}`),
    '*': ({ data }) => console.log('Hashnode event', data.eventType),
  },
});
```

The handler responds `401` for a bad signature, `400` for a malformed body, `500` if a handler throws and `200` otherwise.

In other frameworks, verify the **raw** request body before parsing it:

```ts
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from '@jowinjohnchemban/hashnode-client/webhooks';

const valid = await verifyWebhookSignature({
  payload: rawBody,
  signature: req.headers[WEBHOOK_SIGNATURE_HEADER],
  secret: process.env.HASHNODE_WEBHOOK_SECRET!,
});
if (!valid) return res.status(401).end();
const { data } = parseWebhookPayload(rawBody);
const post = data.post && (await hashnode.getPostById(data.post.id));
```

Signatures use the format `x-hashnode-signature: t=<timestamp>,v1=<hex HMAC-SHA256 of "<timestamp>.<body>">`. Signatures older than 5 minutes are rejected; change this with `toleranceSeconds`. Use `generateWebhookSignature(body, secret)` to sign test requests.

> [!NOTE]
> Hashnode's current docs don't describe the webhook signing scheme. This implementation follows Hashnode's previously published format. If verification fails for real deliveries, please [open an issue](https://github.com/jowinjohnchemban/hashnode-client/issues/new/choose) with the header format you receive.

## Examples

See [`examples/`](examples) for a Node script, Next.js data fetching and webhook handlers.

## Upgrading from 1.x

See [docs/MIGRATION.md](docs/MIGRATION.md).

## Testing your integration

In your own tests, pass a mock `fetch` to the client instead of mocking the module:

```ts
const fetch = async () =>
  Response.json({ data: { publication: { post: { id: '1', title: 'Hello' } } } });
const hashnode = new HashnodeClient({ host: 'blog.example.com', fetch });
```

The library itself is covered by unit tests, daily contract tests against the live Hashnode schema, and optional live tests against a Pro publication. See [CONTRIBUTING.md](CONTRIBUTING.md#testing).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

Open source under the [MIT License](LICENSE).
