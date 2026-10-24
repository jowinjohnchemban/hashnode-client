# Getting started

## Requirements

- A Hashnode publication on a **Pro plan**. Since May 2026, Hashnode serves API requests only for Pro publications; others get a `FORBIDDEN` error. See the [Hashnode announcement](https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access).
- Node.js 22 or later, or any runtime with `fetch` and Web Crypto: Deno, Bun, Cloudflare Workers, Vercel Edge.

## Install

```sh
pnpm add @jowinjohnchemban/hashnode-client
# npm install @jowinjohnchemban/hashnode-client
# yarn add @jowinjohnchemban/hashnode-client
# bun add @jowinjohnchemban/hashnode-client
```

The package ships ESM and CommonJS builds with TypeScript types, and has no runtime dependencies.

```ts
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client'; // ESM
const { HashnodeClient } = require('@jowinjohnchemban/hashnode-client'); // CommonJS
```

## Configure

Pass options to the constructor, or set environment variables. Explicit options win.

```ts
const hashnode = new HashnodeClient({
  host: 'blog.example.com', // your Hashnode subdomain or custom domain
});
```

```sh
# .env
HASHNODE_PUBLICATION_HOST=blog.example.com
HASHNODE_ACCESS_TOKEN=...      # optional, only needed for drafts
HASHNODE_WEBHOOK_SECRET=...    # optional, only needed for webhooks
```

```ts
const hashnode = new HashnodeClient(); // reads HASHNODE_* variables
```

See the [API reference](API.md#options) for every option, and [`.env.example`](../.env.example) for every variable.

## First queries

```ts
// Publication details
const publication = await hashnode.getPublication();

// The latest 10 posts
const { items: posts, pageInfo } = await hashnode.getPosts({ first: 10 });

// The next page
const next = await hashnode.getPosts({ first: 10, after: pageInfo.endCursor });

// One post with its content (null if the slug doesn't exist)
const post = await hashnode.getPost('my-first-post');
console.log(post?.content.html);

// Search
const results = await hashnode.searchPosts('graphql');

// Every post, fetched lazily page by page
for await (const post of hashnode.iteratePosts()) {
  console.log(post.slug);
}
```

## Handle errors

Client methods throw `HashnodeError`. Check `code` to decide what to do:

```ts
import { isHashnodeError } from '@jowinjohnchemban/hashnode-client';

try {
  await hashnode.getPosts();
} catch (error) {
  if (isHashnodeError(error) && error.code === 'FORBIDDEN') {
    // The publication is not on a Hashnode Pro plan.
  }
  throw error;
}
```

If you'd rather not handle errors, the [convenience functions](API.md#convenience-functions) return `[]` or `null` on failure instead.

## Get an access token

You only need a token for drafts. Create one in Hashnode under **Account Settings → Developer**, and keep it on the server. Never ship it to the browser.

## Next steps

- [Next.js guide](NEXTJS.md) to build a blog with caching and on-demand revalidation
- [Webhooks](WEBHOOKS.md) to react when posts are published
- [API reference](API.md) for everything else
