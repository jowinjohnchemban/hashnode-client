# Troubleshooting

## `FORBIDDEN`: "Publication does not have an active Pro plan"

Since May 2026, Hashnode serves API requests only for publications on a **Pro plan**. Upgrade the publication in its dashboard under **Billing**; access starts working as soon as checkout completes. See the [Hashnode announcement](https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access).

Also check that `host` is your publication's host, for example `yourblog.hashnode.dev` or your custom domain. A full URL such as `https://yourblog.hashnode.dev/` also works; the client reduces it to the host.

## The 1.x client stopped working

Version 1.x calls `https://gql.hashnode.com`, which now redirects to an announcement page. Upgrade to 2.x, which uses `https://gql-beta.hashnode.com/`. See [Migrating from 1.x](MIGRATION.md).

## `CONFIG_ERROR`: "No publication host configured"

Pass `host` to the client or set `HASHNODE_PUBLICATION_HOST`. In Next.js, check that the variable is set for the environment you're running (development, preview or production).

## `UNAUTHENTICATED` from `getDrafts`

Drafts need a personal access token. Pass `token` or set `HASHNODE_ACCESS_TOKEN`. Create a token in Hashnode under **Account Settings → Developer**.

## `TIMEOUT`

The request took longer than `timeoutMs` (15 seconds by default). Raise it with `new HashnodeClient({ timeoutMs: 30_000 })` or `HASHNODE_TIMEOUT_MS`.

## The convenience functions return empty results

`getBlogPosts()` and the other convenience functions never throw: they log the error with `console.error` and return `[]` or `null`. Check your server logs for `[hashnode-client] … failed`, or switch to `HashnodeClient` to get the error.

## Search returns nothing

- Search needs the publication ID. The client looks it up from `host`, so `host` must be correct. To skip the lookup, set `publicationId`.
- Hashnode's search index can lag behind newly published posts.

## Next.js keeps showing old content

The client only caches when you pass `next` or `cache` options. With `next.revalidate`, content refreshes after that many seconds. To update immediately, tag your requests and call `revalidateTag` from a [webhook](WEBHOOKS.md). See the [Next.js guide](NEXTJS.md).

## Webhook requests return `401`

- The secret must match the one shown for the webhook in Hashnode.
- Verify the **raw** request body. Parsing and re-serializing JSON changes the bytes.
- Server clocks more than 5 minutes apart fail the timestamp check. Fix the clock, or raise `toleranceSeconds`.
- If it still fails, see the note in the [webhooks guide](WEBHOOKS.md#signature-format).

## Using a custom query

`request()` sends any GraphQL query. If it fails with `GRAPHQL_VALIDATION_FAILED`, the query doesn't match the schema; check field names against the [Hashnode schema](https://github.com/Hashnode/gql-skill).

## Still stuck?

[Open an issue](https://github.com/jowinjohnchemban/hashnode-client/issues/new/choose) with the package version, runtime, and the error's `code` and `message`. Don't include tokens or secrets.
