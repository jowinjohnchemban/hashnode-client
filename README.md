# @jowinjohnchemban/hashnode-client

[![npm version](https://img.shields.io/npm/v/@jowinjohnchemban/hashnode-client?logo=npm)](https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client)
[![npm downloads](https://img.shields.io/npm/dm/@jowinjohnchemban/hashnode-client)](https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client)
[![Node.js](https://img.shields.io/node/v/@jowinjohnchemban/hashnode-client?logo=nodedotjs)](package.json)
[![Types](https://img.shields.io/npm/types/@jowinjohnchemban/hashnode-client)](docs/API.md#types)
[![CI](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/ci.yml/badge.svg)](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/ci.yml)
[![API integration](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/integration.yml/badge.svg)](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/integration.yml)
[![CodeQL](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/codeql.yml/badge.svg)](https://github.com/jowinjohnchemban/hashnode-client/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A typed, zero-dependency client for the [Hashnode](https://hashnode.com) GraphQL API. Use Hashnode as a headless CMS from Node.js, Next.js and edge runtimes, verify Hashnode webhooks, and give AI assistants access to your blog through MCP.

> [!IMPORTANT]
> Since May 2026 Hashnode only serves API requests for publications on a **Pro plan**. Requests for other publications fail with `HashnodeError` code `FORBIDDEN`. See the [Hashnode announcement](https://hashnode.com/changelog/2026-05-13-graphql-api-paid-access).

## Contents

- [Features](#features)
- [Install](#install)
- [Quick start](#quick-start)
- [Usage](#usage)
- [Documentation](#documentation)
- [Compatibility](#compatibility)
- [Versioning](#versioning)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

- **Typed methods** for posts, search, series, static pages, comments, recommendations and drafts, plus `request()` for custom queries
- **Pagination** with cursors, or `iteratePosts()` to walk every post
- **Predictable errors**: `HashnodeError` with Hashnode's error code, request timeouts and `AbortSignal` support
- **Next.js ready**: `revalidate` and cache `tags` per client or per request
- **Webhooks**: signature verification on Web Crypto and a drop-in route handler
- **MCP server**: let AI assistants (Claude, Cursor, VS Code Copilot) read your blog with `npx -y @jowinjohnchemban/hashnode-client`
- **Runs anywhere**: ESM and CommonJS, Node.js 22+, Deno, Bun, Cloudflare Workers and Vercel Edge
- **No runtime dependencies**, published with npm provenance

## Install

```sh
pnpm add @jowinjohnchemban/hashnode-client
```

Or use `npm install`, `yarn add` or `bun add`.

## Quick start

```ts
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

const hashnode = new HashnodeClient({ host: 'blog.example.com' });

const publication = await hashnode.getPublication();
const { items: posts } = await hashnode.getPosts({ first: 10 });
const post = await hashnode.getPost('my-first-post'); // null if it doesn't exist
```

Every option can also come from an environment variable (`HASHNODE_PUBLICATION_HOST`, `HASHNODE_ACCESS_TOKEN`, …; see [`.env.example`](.env.example)), so `new HashnodeClient()` works too.

## Usage

### Methods

| Method                                            | Returns                                   |
| ------------------------------------------------- | ----------------------------------------- |
| `getPublication()`                                | `Publication \| null`                     |
| `getPosts({ first?, after?, tagSlugs? })`         | `Page<BlogPost>`                          |
| `iteratePosts({ first?, tagSlugs? })`             | `AsyncGenerator<BlogPost>`                |
| `getPost(slug)` / `getPostById(id)`               | `BlogPostDetail \| null`                  |
| `searchPosts(query, { first?, after?, sortBy? })` | `Page<BlogPost>`                          |
| `getSeriesList()` / `getSeries(slug)`             | `Page<Series>` / `Series \| null`         |
| `getSeriesPosts(slug, { first?, after? })`        | `Page<BlogPost>`                          |
| `getStaticPages()` / `getStaticPage(slug)`        | `Page<StaticPage>` / `StaticPage \| null` |
| `getPostComments(postId, { first?, after? })`     | `Page<Comment>`                           |
| `getRecommendedPublications()`                    | `RecommendedPublication[]`                |
| `getDrafts({ first?, after? })`                   | `Page<Draft>` (requires `token`)          |
| `request(query, variables?)`                      | raw GraphQL `data`                        |

All of them are described in the [API reference](docs/API.md).

### Pagination

```ts
const page = await hashnode.getPosts({ first: 20 });
const next = await hashnode.getPosts({ first: 20, after: page.pageInfo.endCursor });

for await (const post of hashnode.iteratePosts()) console.log(post.slug);
```

### Errors

```ts
import { isHashnodeError } from '@jowinjohnchemban/hashnode-client';

try {
  await hashnode.getPosts();
} catch (error) {
  if (isHashnodeError(error)) console.error(error.code, error.message); // e.g. FORBIDDEN, TIMEOUT
}
```

All error codes are listed in the [API reference](docs/API.md#errors). If you prefer `[]` or `null` instead of exceptions, use the [convenience functions](docs/API.md#convenience-functions) (`getBlogPosts()`, `getBlogPostBySlug()`, …).

### Next.js

```ts
export const hashnode = new HashnodeClient({ next: { revalidate: 3600, tags: ['hashnode'] } });
```

```ts
// app/api/hashnode/route.ts: revalidate when you publish
import { revalidateTag } from 'next/cache';
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({ handlers: { '*': () => revalidateTag('hashnode') } });
```

The [Next.js guide](docs/NEXTJS.md) covers pages, metadata, sitemaps and search, and the [webhooks guide](docs/WEBHOOKS.md) covers webhook setup.

### MCP server for AI assistants

Give Claude, Cursor, VS Code Copilot or any MCP client read-only access to your blog:

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

Tools include `list_posts`, `get_post`, `search_posts`, series, static pages and comments. Setup for each client is in the [MCP guide](docs/MCP.md).

### Testing your code

Pass a mock `fetch` instead of mocking the module:

```ts
const fetch = async () =>
  Response.json({ data: { publication: { post: { id: '1', title: 'Hello' } } } });
const hashnode = new HashnodeClient({ host: 'blog.example.com', fetch });
```

## Documentation

| Guide                                      | Covers                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| [Getting started](docs/GETTING_STARTED.md) | Setup, configuration and first queries                    |
| [API reference](docs/API.md)               | Options, methods, types, errors and exports               |
| [Next.js guide](docs/NEXTJS.md)            | App Router pages, caching, sitemaps, search, revalidation |
| [Webhooks](docs/WEBHOOKS.md)               | Setup, verification, events and testing                   |
| [MCP server](docs/MCP.md)                  | Using the blog from AI assistants                         |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common errors and fixes                                   |
| [Migrating from 1.x](docs/MIGRATION.md)    | Breaking changes in 2.0                                   |
| [Examples](examples)                       | Node.js script, Next.js data fetching, webhook handlers   |
| [Changelog](CHANGELOG.md)                  | Release history                                           |

## Compatibility

| Runtime                             | Supported                                            |
| ----------------------------------- | ---------------------------------------------------- |
| Node.js                             | 22, 24, 26 (tested on Linux, macOS, Windows)         |
| Deno, Bun                           | Yes                                                  |
| Cloudflare Workers, Vercel Edge     | Yes                                                  |
| Next.js                             | App Router and Pages Router                          |
| Browsers                            | Works, but never ship an access token to the browser |
| MCP server (`/mcp`, `hashnode-mcp`) | Node.js 22+                                          |

Module formats: ESM (`import`) and CommonJS (`require`), with TypeScript declarations for both.

## Versioning

This project follows [Semantic Versioning](https://semver.org). Releases are automated from [Conventional Commits](https://www.conventionalcommits.org/) and listed in the [changelog](CHANGELOG.md) and on [GitHub Releases](https://github.com/jowinjohnchemban/hashnode-client/releases). Every npm release is built and published by GitHub Actions with a provenance attestation.

## Contributing

Contributions are welcome! Read the [contributing guide](CONTRIBUTING.md) for setup, testing and the release process, and follow the [code of conduct](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately as described in the [security policy](SECURITY.md).

## License

[MIT](LICENSE) © 2025–2026 Jowin John Chemban

This project is not affiliated with Hashnode.
