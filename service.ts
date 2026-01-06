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

import { GraphQLClient } from './graphql-client';
import { HASHNODE_CONFIG } from './config';
import { HashnodeQueries } from './queries';
import type {
  BlogPost,
  BlogPostDetail,
  GraphQLResponse,
  PublicationPostsResponse,
  PublicationPostResponse,
  Publication,
  PublicationResponse,
} from './types';

/**
 * Service class for Hashnode API operations
 * Follows Single Responsibility Principle - handles only Hashnode API interactions
 */
export class HashnodeService {
  private readonly apiUrl: string;
  private readonly publicationHost: string;
  private readonly timeout: number;

  constructor(
    apiUrl = HASHNODE_CONFIG.API_URL,
    publicationHost = HASHNODE_CONFIG.PUBLICATION_HOST,
    timeout = HASHNODE_CONFIG.TIMEOUT_MS
  ) {
    this.apiUrl = apiUrl;
    this.publicationHost = publicationHost;
    this.timeout = timeout;
  }

  /**
   * Execute a GraphQL query with Next.js server-side caching
   */
  private async executeQuery<T>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    return GraphQLClient.query<GraphQLResponse<T>>(
      this.apiUrl,
      { query, variables },
      { 
        timeout: this.timeout,
      }
    );
  }

  /**
   * Validate GraphQL response and throw on errors
   */
  private validateResponse<T>(response: GraphQLResponse<T>): T {
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors.map((e) => e.message).join(', ');
      throw new Error(`GraphQL error: ${errorMessages}`);
    }

    if (!response.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return response.data;
  }

  /**
   * Fetch publication details for SEO
   */
  async getPublication(): Promise<Publication | null> {
    try {
      const response = await this.executeQuery<PublicationResponse>(
        HashnodeQueries.getPublication(),
        { host: this.publicationHost }
      );
      
      const data = this.validateResponse(response);
      return data.publication;
    } catch {
      return null;
    }
  }

  /**
   * Fetch blog posts with automatic fallback to basic query
   */
  async getBlogPosts(count?: number): Promise<BlogPost[]> {
    const limit = Math.min(
      count ?? HASHNODE_CONFIG.DEFAULT_POSTS_COUNT,
      HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST
    );
    const variables = { host: this.publicationHost, first: limit };

    try {
      // Try extended query first
      const response = await this.executeQuery<PublicationPostsResponse>(
        HashnodeQueries.getBlogPosts(true),
        variables
      );
      
      const data = this.validateResponse(response);
      return data.publication.posts.edges.map((edge) => edge.node);
    } catch (error) {
      // Fallback to basic query if extended fails
      try {
        const response = await this.executeQuery<PublicationPostsResponse>(
          HashnodeQueries.getBlogPosts(false),
          variables
        );
        
        const data = this.validateResponse(response);
        return data.publication.posts.edges.map((edge) => edge.node);
      } catch {
        // Return empty array on complete failure
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Fetch a single blog post by slug
   */
  async getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new Error('Invalid slug parameter');
    }

    const cleanSlug = slug.trim();
    const variables = { host: this.publicationHost, slug: cleanSlug };

    try {
      // Try extended query first
      const response = await this.executeQuery<PublicationPostResponse>(
        HashnodeQueries.getBlogPostBySlug(true),
        variables
      );
      
      const data = this.validateResponse(response);
      return data.publication.post;
    } catch (error) {
      // Fallback to basic query if extended fails (e.g., GraphQL errors)
      try {
        const response = await this.executeQuery<PublicationPostResponse>(
          HashnodeQueries.getBlogPostBySlug(false),
          variables
        );
        
        const data = this.validateResponse(response);
        return data.publication.post;
      } catch {
        // If both queries fail, throw the original error
        throw error;
      }
    }
  }

  /**
   * Search posts within the publication
   */
  async searchPosts(query: string, limit: number = 10): Promise<BlogPost[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const variables = {
        first: Math.min(limit, HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
        filter: {
          publicationId: this.publicationHost,
          query: query.trim(),
        },
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.searchPosts(),
        variables
      );

      const data = this.validateResponse(response);
      return data.searchPostsOfPublication.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }

  /**
   * Fetch list of series in the publication
   */
  async getSeriesList(limit: number = 10): Promise<any[]> {
    try {
      const variables = {
        host: this.publicationHost,
        first: Math.min(limit, HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.getSeriesList(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.seriesList.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }

  /**
   * Fetch a single series by slug
   */
  async getSeries(slug: string): Promise<any | null> {
    if (!slug || slug.trim().length === 0) {
      return null;
    }

    try {
      const variables = { host: this.publicationHost, slug: slug.trim() };
      const response = await this.executeQuery<any>(
        HashnodeQueries.getSeries(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.series;
    } catch {
      return null;
    }
  }

  /**
   * Fetch posts in a series
   */
  async getSeriesPosts(seriesSlug: string, limit: number = 10): Promise<BlogPost[]> {
    if (!seriesSlug || seriesSlug.trim().length === 0) {
      return [];
    }

    try {
      const variables = {
        host: this.publicationHost,
        seriesSlug: seriesSlug.trim(),
        first: Math.min(limit, HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.getSeriesPosts(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.series.posts.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }

  /**
   * Fetch static pages from the publication
   */
  async getStaticPages(limit: number = 10): Promise<any[]> {
    try {
      const variables = {
        host: this.publicationHost,
        first: Math.min(limit, HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.getStaticPages(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.staticPages.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }

  /**
   * Fetch a single static page by slug
   */
  async getStaticPage(slug: string): Promise<any | null> {
    if (!slug || slug.trim().length === 0) {
      return null;
    }

    try {
      const variables = { host: this.publicationHost, slug: slug.trim() };
      const response = await this.executeQuery<any>(
        HashnodeQueries.getStaticPage(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.staticPage;
    } catch {
      return null;
    }
  }

  /**
   * Fetch comments for a post
   */
  async getPostComments(postId: string, limit: number = 20): Promise<any[]> {
    if (!postId || postId.trim().length === 0) {
      return [];
    }

    try {
      const variables = {
        postId: postId.trim(),
        first: Math.min(limit, 50), // Max 50 comments per page
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.getPostComments(),
        variables
      );

      const data = this.validateResponse(response);
      return data.post.comments.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }

  /**
   * Fetch recommended publications
   */
  async getRecommendedPublications(): Promise<any[]> {
    try {
      const variables = { host: this.publicationHost };
      const response = await this.executeQuery<any>(
        HashnodeQueries.getRecommendedPublications(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.recommendedPublications;
    } catch {
      return [];
    }
  }

  /**
   * Fetch drafts from the publication (requires authentication)
   */
  async getDrafts(limit: number = 10): Promise<any[]> {
    try {
      const variables = {
        host: this.publicationHost,
        first: Math.min(limit, HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
      };

      const response = await this.executeQuery<any>(
        HashnodeQueries.getDrafts(),
        variables
      );

      const data = this.validateResponse(response);
      return data.publication.drafts.edges.map((edge: any) => edge.node);
    } catch {
      return [];
    }
  }
}

/**
 * Singleton instance for application-wide use
 */
export const hashnodeService = new HashnodeService();
