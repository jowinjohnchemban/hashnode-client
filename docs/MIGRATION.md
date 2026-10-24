# Migrating from 1.x to 2.0

Version 2 rewrites the client for Hashnode's current API. Most apps only need to update their imports and handle the new Pro-plan requirement.

## Hashnode API changes (affect every version)

- **Endpoint:** `https://gql.hashnode.com` now redirects to an announcement. 2.0 uses `https://gql-beta.hashnode.com/`. 1.x can no longer reach the API.
- **Pro plan required:** Hashnode only serves publications on a Pro plan. Other publications get `HashnodeError` with code `FORBIDDEN`.

## Package

- Requires Node.js 22+ (or any runtime with `fetch` and Web Crypto).
- No runtime dependencies (`axios` was removed).
- Built output lives in `dist/` with ESM and CommonJS entry points. The `./types`, `./config` and `./source/*` subpath exports were removed. Import types from the package root and webhook helpers from `@jowinjohnchemban/hashnode-client/webhooks` or the root.

## Client

| 1.x                                                              | 2.0                                                                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `hashnodeService` / `new HashnodeService(apiUrl, host, timeout)` | `new HashnodeClient({ endpoint, host, timeoutMs })`                                                 |
| `HASHNODE_CONFIG`                                                | Constructor options, environment variables, and the `DEFAULT_*` / `MAX_*` constants                 |
| Service methods returned `[]`/`null` on any error                | `HashnodeClient` methods throw `HashnodeError`; lookups return `null` only when the item is missing |
| List methods returned arrays                                     | `HashnodeClient` list methods return `Page<T>` (`items`, `pageInfo`, `totalDocuments`)              |
| `hashnodeService.getBlogPosts(count)`                            | `client.getPosts({ first })`                                                                        |
| `hashnodeService.getBlogPostBySlug(slug)`                        | `client.getPost(slug)`                                                                              |

The top-level convenience functions (`getBlogPosts`, `getBlogPostBySlug`, `getPublication`, `searchPosts`, …) keep their 1.x signatures and still return `[]`/`null` on failure. They now log the error with `console.error`.

## Data types

Types now match the Hashnode schema:

- Nullable fields are typed `T | null` instead of optional.
- `Publication.descriptionSEO` (deprecated by Hashnode) was removed. Use `publication.seo?.description`.
- `Series.createdAt`, `Series.sortOrder`, `Comment.myTotalReactions`, `Draft.dateUpdated` and `RecommendedPublicationEdge.totalFollowersGained` were removed; Hashnode no longer provides them.
- Posts now include `url`, `subtitle`, `updatedAt`, `reactionCount` and `responseCount`.
- Types that did not correspond to the API (`NewsletterSubscriber`, `PostStats`, webhook-management types and similar) were removed.

## Bug fixes

- `searchPosts` sent the publication host as `publicationId`, so it always failed. It now resolves the publication ID.
- Requests now honour `timeoutMs` and can be cancelled with an `AbortSignal`.
- `getDrafts` now sends `HASHNODE_ACCESS_TOKEN`.
- `HASHNODE_API_URL` and `HASHNODE_TIMEOUT_MS` are now read.
- Next.js requests no longer set both `cache: 'no-store'` and `revalidate`, which conflicted. Caching is opt-in.

## Webhooks

- `verifyWebhookSignature(payload, signature, secret)` is now `await verifyWebhookSignature({ payload, signature, secret })`. It parses the `t=…,v1=…` header and checks the timestamp.
- `generateWebhookSignature` is async and returns the full header value.
- Event names are Hashnode's lowercase names (`post_published`, …), read from `payload.data.eventType`.
- `processWebhook(payload, handlers)` is now `dispatchWebhook(payload, handlers)`. `createWebhookHandler` gives you a complete route handler.
- The webhook management mutations (`createWebhook`, …) were removed because the API no longer provides them.
