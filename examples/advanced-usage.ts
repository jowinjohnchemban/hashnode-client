/**
 * Next.js App Router usage: cached data fetching, sitemaps and search.
 *
 * These functions are meant to be copied into a Next.js app; they are
 * type-checked here but not executed.
 */

import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';

// One client per app. Cache responses in the Next.js data cache for 5 minutes
// and tag them so a webhook can revalidate on publish.
export const hashnode = new HashnodeClient({
  host: 'blog.example.com',
  next: { revalidate: 300, tags: ['hashnode'] },
});

/** app/blog/page.tsx */
export async function listPosts(cursor?: string) {
  const { items, pageInfo } = await hashnode.getPosts({ first: 12, after: cursor });
  return { posts: items, nextCursor: pageInfo.hasNextPage ? pageInfo.endCursor : null };
}

/** app/blog/[slug]/page.tsx */
export async function loadPost(slug: string) {
  // Per-request options override the client defaults.
  return hashnode.getPost(slug, { next: { revalidate: 60, tags: ['hashnode', `post:${slug}`] } });
}

/** app/sitemap.ts: walk every page of posts. */
export async function sitemap(): Promise<{ url: string; lastModified: string }[]> {
  const entries: { url: string; lastModified: string }[] = [];
  for await (const post of hashnode.iteratePosts()) {
    entries.push({ url: post.url, lastModified: post.updatedAt ?? post.publishedAt });
  }
  return entries;
}

/** Search with a timeout of your own on top of the client's. */
export async function search(query: string) {
  const { items } = await hashnode.searchPosts(
    query,
    { first: 10, sortBy: 'DATE_PUBLISHED_DESC' },
    { signal: AbortSignal.timeout(5_000), cache: 'no-store' },
  );
  return items;
}

/** Fields the typed methods do not cover: use `request` with your own query. */
export async function postViews(slug: string) {
  const data = await hashnode.request<{ publication: { post: { views: number | null } | null } }>(
    `query ($host: String!, $slug: String!) {
      publication(host: $host) { post(slug: $slug) { views } }
    }`,
    { host: 'blog.example.com', slug },
  );
  return data.publication.post?.views ?? 0;
}
