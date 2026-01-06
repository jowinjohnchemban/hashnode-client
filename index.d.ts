/**
 * Hashnode API Integration Module
 *
 * **Standalone Adapter/Handler** for Hashnode GraphQL API.
 * This module encapsulates all Hashnode-specific logic and can be replaced
 * with another blogging platform adapter without affecting consuming code.
 *
 * @module lib/api/hashnode
 * @see {@link ./README.md} for detailed architecture documentation
 *
 * @example Basic Usage
 * ```typescript
 * import { getBlogPosts, getBlogPostBySlug } from '@/lib/api/hashnode';
 *
 * const posts = await getBlogPosts(10);
 * const post = await getBlogPostBySlug('my-post-slug');
 * ```
 *
 * @architecture
 * - Facade Pattern: Simplified API for consumers
 * - Service Layer: Business logic encapsulation
 * - Repository Pattern: Data access abstraction
 */
export * from './types';
export * from './config';
export { HashnodeService, hashnodeService } from './service';
export * from './webhooks';
import type { BlogPost, BlogPostDetail, Publication } from './types';
/**
 * Fetch publication details
 * @returns Publication details or null on error
 */
export declare function getPublication(): Promise<Publication | null>;
/**
 * Fetch blog posts from Hashnode
 * @param count - Number of posts to fetch
 * @returns Array of blog posts or empty array on error
 */
export declare function getBlogPosts(count?: number): Promise<BlogPost[]>;
/**
 * Fetch a single blog post by slug
 * @param slug - Blog post slug
 * @returns Blog post or null if not found/error
 */
export declare function getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null>;
/**
 * Search posts within the publication
 * @param query - Search query string
 * @param limit - Number of results to return
 * @returns Array of matching blog posts or empty array on error
 */
export declare function searchPosts(query: string, limit?: number): Promise<BlogPost[]>;
/**
 * Fetch series list from the publication
 * @param limit - Number of series to fetch
 * @returns Array of series or empty array on error
 */
export declare function getSeriesList(limit?: number): Promise<any[]>;
/**
 * Fetch a single series by slug
 * @param slug - Series slug
 * @returns Series or null if not found/error
 */
export declare function getSeries(slug: string): Promise<any | null>;
/**
 * Fetch posts within a series
 * @param seriesSlug - Series slug
 * @param limit - Number of posts to fetch
 * @returns Array of posts in the series or empty array on error
 */
export declare function getSeriesPosts(seriesSlug: string, limit?: number): Promise<BlogPost[]>;
/**
 * Fetch static pages from the publication
 * @param limit - Number of pages to fetch
 * @returns Array of static pages or empty array on error
 */
export declare function getStaticPages(limit?: number): Promise<any[]>;
/**
 * Fetch a single static page by slug
 * @param slug - Static page slug
 * @returns Static page or null if not found/error
 */
export declare function getStaticPage(slug: string): Promise<any | null>;
/**
 * Fetch comments for a post
 * @param postId - Post ID
 * @param limit - Number of comments to fetch
 * @returns Array of comments or empty array on error
 */
export declare function getPostComments(postId: string, limit?: number): Promise<any[]>;
/**
 * Fetch recommended publications
 * @returns Array of recommended publications or empty array on error
 */
export declare function getRecommendedPublications(): Promise<any[]>;
/**
 * Fetch drafts from the publication (requires authentication)
 * @param limit - Number of drafts to fetch
 * @returns Array of drafts or empty array on error
 */
export declare function getDrafts(limit?: number): Promise<any[]>;
//# sourceMappingURL=index.d.ts.map