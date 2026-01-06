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

// Re-export webhook utilities
export * from './webhooks';

/**
 * Convenience functions using the singleton service
 */
import { hashnodeService } from './service';
import type { BlogPost, BlogPostDetail, Publication } from './types';

/**
 * Fetch publication details
 * @returns Publication details or null on error
 */
export async function getPublication(): Promise<Publication | null> {
  try {
    return await hashnodeService.getPublication();
  } catch {
    return null;
  }
}

/**
 * Fetch blog posts from Hashnode
 * @param count - Number of posts to fetch
 * @returns Array of blog posts or empty array on error
 */
export async function getBlogPosts(count?: number): Promise<BlogPost[]> {
  try {
    return await hashnodeService.getBlogPosts(count);
  } catch {
    return [];
  }
}

/**
 * Fetch a single blog post by slug
 * @param slug - Blog post slug
 * @returns Blog post or null if not found/error
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  try {
    return await hashnodeService.getBlogPostBySlug(slug);
  } catch {
    return null;
  }
}

/**
 * Search posts within the publication
 * @param query - Search query string
 * @param limit - Number of results to return
 * @returns Array of matching blog posts or empty array on error
 */
export async function searchPosts(query: string, limit?: number): Promise<BlogPost[]> {
  try {
    return await hashnodeService.searchPosts(query, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch series list from the publication
 * @param limit - Number of series to fetch
 * @returns Array of series or empty array on error
 */
export async function getSeriesList(limit?: number): Promise<any[]> {
  try {
    return await hashnodeService.getSeriesList(limit);
  } catch {
    return [];
  }
}

/**
 * Fetch a single series by slug
 * @param slug - Series slug
 * @returns Series or null if not found/error
 */
export async function getSeries(slug: string): Promise<any | null> {
  try {
    return await hashnodeService.getSeries(slug);
  } catch {
    return null;
  }
}

/**
 * Fetch posts within a series
 * @param seriesSlug - Series slug
 * @param limit - Number of posts to fetch
 * @returns Array of posts in the series or empty array on error
 */
export async function getSeriesPosts(seriesSlug: string, limit?: number): Promise<BlogPost[]> {
  try {
    return await hashnodeService.getSeriesPosts(seriesSlug, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch static pages from the publication
 * @param limit - Number of pages to fetch
 * @returns Array of static pages or empty array on error
 */
export async function getStaticPages(limit?: number): Promise<any[]> {
  try {
    return await hashnodeService.getStaticPages(limit);
  } catch {
    return [];
  }
}

/**
 * Fetch a single static page by slug
 * @param slug - Static page slug
 * @returns Static page or null if not found/error
 */
export async function getStaticPage(slug: string): Promise<any | null> {
  try {
    return await hashnodeService.getStaticPage(slug);
  } catch {
    return null;
  }
}

/**
 * Fetch comments for a post
 * @param postId - Post ID
 * @param limit - Number of comments to fetch
 * @returns Array of comments or empty array on error
 */
export async function getPostComments(postId: string, limit?: number): Promise<any[]> {
  try {
    return await hashnodeService.getPostComments(postId, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch recommended publications
 * @returns Array of recommended publications or empty array on error
 */
export async function getRecommendedPublications(): Promise<any[]> {
  try {
    return await hashnodeService.getRecommendedPublications();
  } catch {
    return [];
  }
}

/**
 * Fetch drafts from the publication (requires authentication)
 * @param limit - Number of drafts to fetch
 * @returns Array of drafts or empty array on error
 */
export async function getDrafts(limit?: number): Promise<any[]> {
  try {
    return await hashnodeService.getDrafts(limit);
  } catch {
    return [];
  }
}
