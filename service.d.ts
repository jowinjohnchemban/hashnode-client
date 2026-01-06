/**
 * Hashnode API Service Layer
 *
 * **Core Business Logic** for the Hashnode adapter.
 * This service class handles all interactions with Hashnode's GraphQL API,
 * providing a clean interface for data fetching operations.
 *
 * @module lib/api/hashnode/service
 *
 * @architecture
 * - **Service Pattern**: Encapsulates business logic
 * - **Singleton**: Single instance exported as `hashnodeService`
 * - **Dependency Injection**: Accepts config via constructor
 * - **Error Handling**: Converts API errors to domain errors
 *
 * @responsibilities
 * - Execute GraphQL queries
 * - Transform API responses to application models
 * - Handle pagination and adjacent post logic
 * - Coordinate caching with Next.js ISR
 *
 * @example Direct Service Usage
 * ```typescript
 * import { hashnodeService } from '@/lib/api/hashnode/service';
 *
 * const posts = await hashnodeService.getBlogPosts(20);
 * ```
 */
import type { BlogPost, BlogPostDetail, Publication } from './types';
/**
 * Service class for Hashnode API operations
 * Follows Single Responsibility Principle - handles only Hashnode API interactions
 */
export declare class HashnodeService {
    private readonly apiUrl;
    private readonly publicationHost;
    private readonly timeout;
    constructor(apiUrl?: "https://gql.hashnode.com", publicationHost?: string, timeout?: 15000);
    /**
     * Execute a GraphQL query with Next.js server-side caching
     */
    private executeQuery;
    /**
     * Validate GraphQL response and throw on errors
     */
    private validateResponse;
    /**
     * Fetch publication details for SEO
     */
    getPublication(): Promise<Publication | null>;
    /**
     * Fetch blog posts with automatic fallback to basic query
     */
    getBlogPosts(count?: number): Promise<BlogPost[]>;
    /**
     * Fetch a single blog post by slug
     */
    getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null>;
    /**
     * Search posts within the publication
     */
    searchPosts(query: string, limit?: number): Promise<BlogPost[]>;
    /**
     * Fetch list of series in the publication
     */
    getSeriesList(limit?: number): Promise<any[]>;
    /**
     * Fetch a single series by slug
     */
    getSeries(slug: string): Promise<any | null>;
    /**
     * Fetch posts in a series
     */
    getSeriesPosts(seriesSlug: string, limit?: number): Promise<BlogPost[]>;
    /**
     * Fetch static pages from the publication
     */
    getStaticPages(limit?: number): Promise<any[]>;
    /**
     * Fetch a single static page by slug
     */
    getStaticPage(slug: string): Promise<any | null>;
    /**
     * Fetch comments for a post
     */
    getPostComments(postId: string, limit?: number): Promise<any[]>;
    /**
     * Fetch recommended publications
     */
    getRecommendedPublications(): Promise<any[]>;
    /**
     * Fetch drafts from the publication (requires authentication)
     */
    getDrafts(limit?: number): Promise<any[]>;
}
/**
 * Singleton instance for application-wide use
 */
export declare const hashnodeService: HashnodeService;
//# sourceMappingURL=service.d.ts.map