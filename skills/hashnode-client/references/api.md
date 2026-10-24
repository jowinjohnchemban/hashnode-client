# API reference (condensed)

Full reference: https://github.com/jowinjohnchemban/hashnode-client/blob/main/docs/API.md

## Client options

`new HashnodeClient(options)`. Every option falls back to an environment variable.

| Option          | Env variable                | Default                            | Notes                                     |
| --------------- | --------------------------- | ---------------------------------- | ----------------------------------------- |
| `host`          | `HASHNODE_PUBLICATION_HOST` | —                                  | URLs are reduced to the host name         |
| `publicationId` | `HASHNODE_PUBLICATION_ID`   | looked up from `host`              | Saves one request before the first search |
| `token`         | `HASHNODE_ACCESS_TOKEN`     | —                                  | Only needed for drafts; server-side only  |
| `endpoint`      | `HASHNODE_API_URL`          | `https://gql-beta.hashnode.com/`   |                                           |
| `timeoutMs`     | `HASHNODE_TIMEOUT_MS`       | `15000`                            |                                           |
| `headers`       | —                           | `{}`                               | Extra headers on every request            |
| `fetch`         | —                           | global `fetch`                     | Custom fetch, for tests or proxies        |
| `dedupe`        | —                           | `true` (`false` with custom fetch) | Share identical concurrent requests       |
| `cache`, `next` | —                           | not set                            | Forwarded to `fetch` (Next.js data cache) |

Every method also accepts per-call options as its last argument: `{ signal, cache, next }`.

## Methods

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
| `getDrafts({ first?, after? })`                   | `Page<Draft>` (requires a token)      |
| `request(query, variables?, options?)`            | Raw GraphQL `data` for custom queries |

`Page<T>` is `{ items: T[]; pageInfo: { hasNextPage; endCursor }; totalDocuments }`.

## Main types

- `BlogPost`: `id`, `slug`, `url`, `title`, `subtitle`, `excerpt`, `publishedAt`, `updatedAt`, `readTimeInMinutes`, `coverImage`, `author`, `tags`, ...
- `BlogPostDetail`: `BlogPost` plus `content` (`html`, `markdown`, `text`), `canonicalUrl`, `seo`, `ogMetaData`, `series`
- `Publication`, `Series`, `StaticPage`, `Comment`, `Draft`, `Author`, `Tag`

Nullable schema fields are typed `T | null`.

## Errors

Methods throw `HashnodeError` with a `code`:

| Code                          | Meaning                                      | What to do                              |
| ----------------------------- | -------------------------------------------- | --------------------------------------- |
| `FORBIDDEN`                   | Publication is not on a Pro plan             | Tell the user; it can't be coded around |
| `NOT_FOUND`                   | Missing item (lookups return `null` instead) |                                         |
| `CONFIG_ERROR`                | No `host` configured                         | Set `HASHNODE_PUBLICATION_HOST`         |
| `UNAUTHENTICATED`             | Drafts without a token                       | Set `HASHNODE_ACCESS_TOKEN` (server)    |
| `TIMEOUT`, `ABORTED`          | Timed out or cancelled                       | Retry or raise `timeoutMs`              |
| `NETWORK_ERROR`, `HTTP_ERROR` | Transport failure                            | Retry                                   |
| `GRAPHQL_VALIDATION_FAILED`   | Bad custom query in `request()`              | Fix the query                           |

## Convenience functions

`getBlogPosts(count?)`, `getBlogPostBySlug(slug)`, `getPublication()`, `searchPosts(query, limit?)` and others use a shared client from environment variables. They never throw: they log and return `[]` or `null`. Prefer `HashnodeClient` in new code so errors can be handled.

## Custom queries

```ts
const data = await hashnode.request<{ publication: { followersCount: number } }>(
  'query ($host: String!) { publication(host: $host) { followersCount } }',
  { host: 'blog.example.com' },
);
```

The Hashnode schema is at https://github.com/Hashnode/gql-skill.
