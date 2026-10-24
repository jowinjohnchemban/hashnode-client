# Next.js guide

This guide builds a blog with the App Router: listing and post pages, metadata, a sitemap, search, and instant updates when you publish on Hashnode.

## 1. Create a shared client

```ts
// lib/hashnode.ts
import 'server-only';
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

export const hashnode = new HashnodeClient({
  // host comes from HASHNODE_PUBLICATION_HOST
  next: { revalidate: 3600, tags: ['hashnode'] },
});
```

- `next.revalidate` caches responses in the Next.js data cache for an hour.
- `next.tags` lets a webhook expire everything at once with `revalidateTag('hashnode')`.
- `server-only` stops the client, and any token, from being bundled for the browser.

The client sets no cache options unless you pass them. Any call can override the defaults:

```ts
await hashnode.getPost(slug, { next: { revalidate: 60, tags: ['hashnode', `post:${slug}`] } });
await hashnode.searchPosts(query, {}, { cache: 'no-store' });
```

## 2. List posts

```tsx
// app/blog/page.tsx
import Link from 'next/link';
import { hashnode } from '@/lib/hashnode';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  const { items, pageInfo } = await hashnode.getPosts({ first: 12, after });

  return (
    <main>
      {items.map((post) => (
        <article key={post.id}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          <p>{post.excerpt}</p>
        </article>
      ))}
      {pageInfo.hasNextPage && pageInfo.endCursor && (
        <Link href={`/blog?after=${encodeURIComponent(pageInfo.endCursor)}`}>Older posts</Link>
      )}
    </main>
  );
}
```

## 3. Post pages with metadata

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hashnode } from '@/lib/hashnode';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { items } = await hashnode.getPosts({ first: 50 });
  return items.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await hashnode.getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.seo?.title ?? post.title,
    description: post.seo?.description ?? post.excerpt,
    alternates: { canonical: post.canonicalUrl ?? post.url },
    openGraph: { images: post.ogMetaData?.image ?? post.coverImage?.url ?? undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await hashnode.getPost((await params).slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content.html }} />
    </article>
  );
}
```

Next.js deduplicates identical `fetch` calls within one render, so `generateMetadata` and the page share a single request. On top of that, the client shares identical requests across concurrent renders and route handlers, so a burst of visitors on an uncached page sends one request to Hashnode. This is a feature of the client, not of Next.js, so it works the same in any Node.js or edge app. See [request de-duplication](API.md#request-de-duplication).

> [!WARNING]
> `content.html` is rendered by Hashnode, but only you control what's published on your blog. If others can publish to your publication, sanitize the HTML before rendering it.

## 4. Sitemap

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { hashnode } from '@/lib/hashnode';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for await (const post of hashnode.iteratePosts()) {
    entries.push({ url: post.url, lastModified: post.updatedAt ?? post.publishedAt });
  }
  return entries;
}
```

## 5. Search

```ts
// app/api/search/route.ts
import { hashnode } from '@/lib/hashnode';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim();
  if (!query) return Response.json([]);

  const { items } = await hashnode.searchPosts(
    query,
    { first: 10 },
    { cache: 'no-store', signal: request.signal },
  );
  return Response.json(items);
}
```

## 6. Revalidate on publish

Point a Hashnode webhook at a route handler. Set `HASHNODE_WEBHOOK_SECRET` to the webhook's secret.

```ts
// app/api/hashnode/route.ts
import { revalidateTag } from 'next/cache';
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  handlers: {
    '*': () => revalidateTag('hashnode'),
  },
});
```

> [!NOTE]
> In Next.js 16, `revalidateTag` takes a cache profile as its second argument, for example `revalidateTag('hashnode', 'max')`. See the [Next.js docs](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).

See the [webhooks guide](WEBHOOKS.md) for setting up the webhook in Hashnode and testing it.

## Edge runtime

The client and webhook helpers use only `fetch` and Web Crypto, so they work with `export const runtime = 'edge'`.

## Errors

On a `FORBIDDEN` error, the publication isn't on a Pro plan. In pages, either let the error reach your `error.tsx` boundary, or use the [convenience functions](API.md#convenience-functions), which return empty results instead of throwing. See [Troubleshooting](TROUBLESHOOTING.md).
