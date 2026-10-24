/**
 * Typed Hashnode GraphQL API client for Node.js, Next.js and edge runtimes.
 *
 * @example
 * ```ts
 * import { HashnodeClient } from '@jowinjohnchemban/hashnode-client';
 *
 * const hashnode = new HashnodeClient({ host: 'blog.example.com' });
 * const { items } = await hashnode.getPosts({ first: 10 });
 * ```
 *
 * @module
 */

import { HashnodeClient } from './client';
import { isHashnodeError } from './errors';
import type {
  BlogPost,
  BlogPostDetail,
  Comment,
  Draft,
  Publication,
  RecommendedPublication,
  Series,
  StaticPage,
} from './types';

export { HashnodeClient, createHashnodeClient } from './client';
export {
  DEFAULT_ENDPOINT,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TIMEOUT_MS,
  MAX_DRAFT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type FetchCacheOptions,
  type HashnodeClientOptions,
  type NextFetchOptions,
} from './config';
export {
  HashnodeError,
  isHashnodeError,
  type GraphQLErrorItem,
  type HashnodeClientErrorCode,
  type HashnodeErrorOptions,
} from './errors';
export type { RequestOptions } from './transport';
export type * from './types';
export * from './webhooks';

// ---------------------------------------------------------------------------
// Convenience functions
//
// These use a shared client configured from environment variables and never
// throw: failures are logged and an empty result is returned. Use
// `HashnodeClient` directly to handle errors and paginate.
// ---------------------------------------------------------------------------

let defaultClient: HashnodeClient | undefined;

function client(): HashnodeClient {
  defaultClient ??= new HashnodeClient();
  return defaultClient;
}

async function safely<T>(name: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const detail = isHashnodeError(error) ? `${error.code}: ${error.message}` : error;
    console.error(`[hashnode-client] ${name} failed`, detail);
    return fallback;
  }
}

/** Fetches publication details, or `null` on error. */
export function getPublication(): Promise<Publication | null> {
  return safely('getPublication', null, () => client().getPublication());
}

/** Fetches the latest posts, or `[]` on error. */
export function getBlogPosts(count?: number): Promise<BlogPost[]> {
  return safely('getBlogPosts', [], async () => (await client().getPosts({ first: count })).items);
}

/** Fetches a post by slug, or `null` if missing or on error. */
export function getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  return safely('getBlogPostBySlug', null, () => client().getPost(slug));
}

/** Searches posts, or `[]` on error. */
export function searchPosts(query: string, limit?: number): Promise<BlogPost[]> {
  if (!query.trim()) return Promise.resolve([]);
  return safely(
    'searchPosts',
    [],
    async () => (await client().searchPosts(query, { first: limit })).items,
  );
}

/** Lists series, or `[]` on error. */
export function getSeriesList(limit?: number): Promise<Series[]> {
  return safely(
    'getSeriesList',
    [],
    async () => (await client().getSeriesList({ first: limit })).items,
  );
}

/** Fetches a series by slug, or `null` if missing or on error. */
export function getSeries(slug: string): Promise<Series | null> {
  return safely('getSeries', null, () => client().getSeries(slug));
}

/** Lists posts in a series, or `[]` on error. */
export function getSeriesPosts(seriesSlug: string, limit?: number): Promise<BlogPost[]> {
  return safely(
    'getSeriesPosts',
    [],
    async () => (await client().getSeriesPosts(seriesSlug, { first: limit })).items,
  );
}

/** Lists static pages, or `[]` on error. */
export function getStaticPages(limit?: number): Promise<StaticPage[]> {
  return safely(
    'getStaticPages',
    [],
    async () => (await client().getStaticPages({ first: limit })).items,
  );
}

/** Fetches a static page by slug, or `null` if missing or on error. */
export function getStaticPage(slug: string): Promise<StaticPage | null> {
  return safely('getStaticPage', null, () => client().getStaticPage(slug));
}

/** Lists comments on a post, or `[]` on error. */
export function getPostComments(postId: string, limit?: number): Promise<Comment[]> {
  return safely(
    'getPostComments',
    [],
    async () => (await client().getPostComments(postId, { first: limit })).items,
  );
}

/** Lists recommended publications, or `[]` on error. */
export function getRecommendedPublications(): Promise<RecommendedPublication[]> {
  return safely('getRecommendedPublications', [], () => client().getRecommendedPublications());
}

/** Lists the token owner's drafts, or `[]` on error. Requires `HASHNODE_ACCESS_TOKEN`. */
export function getDrafts(limit?: number): Promise<Draft[]> {
  return safely('getDrafts', [], async () => (await client().getDrafts({ first: limit })).items);
}
