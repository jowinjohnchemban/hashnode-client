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
