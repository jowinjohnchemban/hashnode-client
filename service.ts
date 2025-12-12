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
   * Execute a GraphQL query
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
        headers: {
          'Content-Type': 'application/json',
        },
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
}

/**
 * Singleton instance for application-wide use
 */
export const hashnodeService = new HashnodeService();
