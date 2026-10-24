# Next.js recipes

Full guide: https://github.com/jowinjohnchemban/hashnode-client/blob/main/docs/NEXTJS.md

## Shared client with caching

```ts
// lib/hashnode.ts
import 'server-only';
import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

export const hashnode = new HashnodeClient({
  next: { revalidate: 3600, tags: ['hashnode'] },
});
```

The client sets no cache options by default. Per-call options override the client's: `hashnode.getPost(slug, { next: { revalidate: 60 } })`.

## Post page with metadata

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
  };
}

export default async function PostPage({ params }: Props) {
  const post = await hashnode.getPost((await params).slug);
  if (!post) notFound();
  return <article dangerouslySetInnerHTML={{ __html: post.content.html }} />;
}
```

## Sitemap

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

## Revalidate on publish

```ts
// app/api/hashnode/route.ts
import { revalidateTag } from 'next/cache';
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  handlers: { '*': () => revalidateTag('hashnode') },
});
```

In Next.js 16, `revalidateTag` takes a cache profile as a second argument, for example `revalidateTag('hashnode', 'max')`.

## Notes

- Keep the client in server code (`server-only`); never use `NEXT_PUBLIC_` for the token.
- Identical concurrent requests share one API call across renders and route handlers, on top of Next.js's per-render `fetch` de-duplication.
- The client and webhook helpers work with `export const runtime = 'edge'`.
