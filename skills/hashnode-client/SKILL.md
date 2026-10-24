---
name: hashnode-client
description: Integrate a Hashnode blog into a JavaScript or TypeScript project with the @jowinjohnchemban/hashnode-client npm package. Use when fetching Hashnode posts, series, static pages, comments or drafts; building a blog, sitemap or search on Hashnode as a headless CMS (Node.js, Next.js, Express, edge runtimes); verifying Hashnode webhooks; or connecting AI assistants to a blog through its MCP server.
license: MIT
compatibility: Node.js 22+ or any runtime with fetch and Web Crypto. The Hashnode publication must be on a Pro plan.
metadata:
  package: '@jowinjohnchemban/hashnode-client'
  repository: https://github.com/jowinjohnchemban/hashnode-client
---

# Hashnode client

Typed, zero-dependency client for the Hashnode GraphQL API. Prefer it over hand-written GraphQL `fetch` calls: it handles the current endpoint, pagination, errors, timeouts, request de-duplication and webhook signatures.

## Before you start

- **The publication must be on a Hashnode Pro plan.** Otherwise every call fails with `HashnodeError` code `FORBIDDEN`. That is a plan problem, not a code bug; tell the user instead of working around it.
- Don't call `https://gql.hashnode.com` directly. It redirects to an announcement page; the client uses the current endpoint.
- Requires Node.js 22+ or an edge runtime (Next.js edge, Cloudflare Workers, Deno, Bun).

## Install and configure

```sh
pnpm add @jowinjohnchemban/hashnode-client   # or npm install / yarn add / bun add
```

Configure with environment variables (add them to `.env` and to the deployment):

```sh
HASHNODE_PUBLICATION_HOST=blog.example.com   # required: the blog's host, no https://
HASHNODE_ACCESS_TOKEN=...                    # only for drafts; server-side only
HASHNODE_WEBHOOK_SECRET=...                  # only for webhooks
```

Frameworks such as Next.js load `.env` automatically. Plain Node.js doesn't: start the app with `node --env-file=.env app.js` (Node.js 20.6+), or load it with a library such as `dotenv`. Without it, `HASHNODE_PUBLICATION_HOST` is unset and calls fail with `CONFIG_ERROR`.

Create **one** client per app, in a server-only module, and reuse it:

```ts
// lib/hashnode.ts
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

export const hashnode = new HashnodeClient(); // reads HASHNODE_* variables
// or: new HashnodeClient({ host: 'blog.example.com' })
```

## Core recipes

```ts
import { isHashnodeError } from '@jowinjohnchemban/hashnode-client';
import { hashnode } from './lib/hashnode';

// Latest posts. List methods return a Page: { items, pageInfo, totalDocuments }.
const { items: posts, pageInfo } = await hashnode.getPosts({ first: 10 });

// Next page: pass the cursor.
const older = await hashnode.getPosts({ first: 10, after: pageInfo.endCursor });

// One post with content. Lookups return null when the item doesn't exist.
const post = await hashnode.getPost('my-first-post');
if (!post) {
  // render a 404
}
const html = post?.content.html;

// Every post, page by page (sitemaps, static generation).
for await (const item of hashnode.iteratePosts()) {
  console.log(item.url);
}

// Search within the publication.
const results = await hashnode.searchPosts('graphql', { first: 5 });

// Handle errors by code.
try {
  await hashnode.getPublication();
} catch (error) {
  if (isHashnodeError(error) && error.code === 'FORBIDDEN') {
    // The publication is not on a Hashnode Pro plan.
  }
  throw error;
}
```

Other methods: `getPublication`, `getPostById`, `getSeriesList`, `getSeries`, `getSeriesPosts`, `getStaticPages`, `getStaticPage`, `getPostComments`, `getRecommendedPublications`, `getDrafts` (needs a token), and `request` for custom GraphQL queries. See [references/api.md](references/api.md).

## Rules that prevent common mistakes

1. **Keep the client on the server.** Never import it in browser code with a token, and never expose `HASHNODE_ACCESS_TOKEN` (no `NEXT_PUBLIC_` prefix). Public reads don't need a token at all.
2. **Check for `null`** from `getPost`, `getPostById`, `getSeries`, `getStaticPage` and `getPublication`, and render a 404.
3. **Use `pageInfo.endCursor` for paging**, not page numbers. `first` is capped at 100 (50 for drafts).
4. **Use `isHashnodeError(error)`** rather than `instanceof` to check errors; it also works when both the ESM and CommonJS builds are loaded.
5. **Use `iteratePosts()`** to walk all posts; don't loop on `getPosts` by hand.
6. **Don't add your own caching layer to avoid duplicate requests.** Identical concurrent queries already share one API request. If you pass a custom `fetch` that sends the same credentials for every request, also pass `dedupe: true`, because sharing is off by default with a custom `fetch`.
7. **Use `content.html` from Hashnode as trusted only if the user controls who publishes** on the blog; otherwise sanitize it before rendering.
8. **In Next.js, cache with `next` options** (`revalidate`, `tags`) and revalidate from a webhook. See [references/nextjs.md](references/nextjs.md).

## Webhooks

To react when posts are published, updated or deleted, use the ready-made Fetch API handler. It verifies the signature on the **raw** body, so never parse the body first:

```ts
// app/api/hashnode/route.ts (any framework with Request/Response works)
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  // secret defaults to HASHNODE_WEBHOOK_SECRET
  handlers: {
    post_published: ({ data }) => {
      console.log('published', data.post?.id);
    },
  },
});
```

Payloads contain IDs only; fetch the content with `hashnode.getPostById(id)`. Details, Express usage and testing: [references/webhooks.md](references/webhooks.md).

## MCP server for AI assistants

If the user wants Claude, Cursor or VS Code Copilot to read their blog, use the package's MCP server instead of writing one:

```json
{
  "mcpServers": {
    "hashnode": {
      "command": "npx",
      "args": ["-y", "@jowinjohnchemban/hashnode-client", "--host", "blog.example.com"]
    }
  }
}
```

It is read-only and never sends an access token. See [references/mcp.md](references/mcp.md).

## Checklist for a new integration

- [ ] Package installed; `HASHNODE_PUBLICATION_HOST` set locally and in the deployment
- [ ] One shared client in a server-only module
- [ ] `null` results render a 404; `FORBIDDEN` is explained as the Pro-plan requirement
- [ ] Lists page with cursors or `iteratePosts()`
- [ ] Next.js: `next: { revalidate, tags }` set, and a webhook calls `revalidateTag`
- [ ] No token in client-side code or public environment variables

Full documentation: https://github.com/jowinjohnchemban/hashnode-client/tree/main/docs
