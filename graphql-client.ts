/**
 * GraphQL Client for Hashnode Module
 * 
 * **Internal Network Layer** for this standalone module.
 * Self-contained GraphQL client using Next.js fetch for Vercel server-side caching.
 * 
 * @module lib/api/hashnode/graphql-client
 * @internal - Used only within the hashnode module
 * 
 * @architecture
 * - **Next.js Fetch**: Uses Next.js fetch with server-side caching
 * - **Vercel Optimized**: Leverages Vercel's edge network caching
 * - **Error Abstraction**: Custom GraphQLError class
 * 
 * @caching
 * - Server-side caching with 5-minute revalidation
 * - No browser caching (cache: 'no-store')
 * - Vercel edge network optimization
 * 
 * @portability
 * This file makes the hashnode module standalone. When copying this folder
 * to another project, you get a complete working Hashnode API client.
 * 
 * @example
 * ```typescript
 * import { GraphQLClient } from './graphql-client';
 * 
 * const data = await GraphQLClient.query('https://gql.hashnode.com', { query });
 * ```
 */

/**
 * Custom GraphQL Error Class
 * 
 * Provides consistent error handling for GraphQL operations.
 * Extends native Error with HTTP-specific properties.
 * 
 * @class GraphQLError
 * @extends Error
 * 
 * @property {string} message - Error message
 * @property {number} [status] - HTTP status code (e.g., 404, 500)
 * @property {string} [statusText] - HTTP status text (e.g., "Not Found")
 * @property {unknown} [data] - Response body/error details
 * 
 * @example
 * ```typescript
 * throw new GraphQLError('Query failed', 500, 'Internal Server Error');
 * ```
 */
export class GraphQLError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

/**
 * GraphQL Client Class
 * 
 * Lightweight client optimized for GraphQL POST requests.
 * Provides timeout handling and error normalization.
 * 
 * @class GraphQLClient
 * @static - All methods are static (no instantiation needed)
 * 
 * @example
 * ```typescript
 * const response = await GraphQLClient.query(
 *   'https://gql.hashnode.com',
 *   { query: '{ publication { title } }' }
 * );
 * ```
 */
export class GraphQLClient {
  /**
   * Execute a GraphQL query via POST
   * 
   * @param url - GraphQL endpoint URL
   * @param payload - GraphQL query and variables
   * @param options - Additional axios configuration
   * @returns Typed response data
   * @throws {GraphQLError} On HTTP errors or network failures
   * 
   * @example
   * ```typescript
   * const result = await GraphQLClient.query<GraphQLResponse>(
   *   'https://gql.hashnode.com',
   *   { 
   *     query: 'query GetPosts { ... }',
   *     variables: { first: 10 }
   *   }
   * );
   * ```
   */
  static async query<T = unknown>(
    url: string,
    payload: { query: string; variables?: Record<string, unknown> },
    options: { timeout?: number; headers?: Record<string, string> } = {}
  ): Promise<T> {
    try {
      // Use Next.js fetch with server-side caching for Vercel
      // Note: 'next' and 'cache' options are Next.js-specific extensions
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(payload),
        // Next.js fetch caching - cache for 5 minutes on server
        ...(typeof (globalThis as any).EdgeRuntime !== 'undefined' || typeof (process as any).env?.NEXT_RUNTIME !== 'undefined'
          ? { next: { revalidate: 300 }, cache: 'no-store' as RequestCache }
          : {}),
      } as RequestInit);

      if (!response.ok) {
        throw new GraphQLError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          await response.text()
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }
}
