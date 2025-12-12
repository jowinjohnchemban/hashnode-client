/**
 * GraphQL Client for Hashnode Module
 * 
 * **Internal Network Layer** for this standalone module.
 * Self-contained GraphQL client to make the hashnode module fully portable
 * and reusable as an open-source library.
 * 
 * @module lib/api/hashnode/graphql-client
 * @internal - Used only within the hashnode module
 * 
 * @architecture
 * - **Adapter Pattern**: Wraps axios for GraphQL requests
 * - **Error Abstraction**: Custom GraphQLError class
 * - **Self-Contained**: No external dependencies (except axios)
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

import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

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
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      const response = await axios.post<T>(url, payload, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new GraphQLError(
          error.message || `HTTP ${error.response?.status}: ${error.response?.statusText}`,
          error.response?.status,
          error.response?.statusText,
          error.response?.data
        );
      }
      throw error;
    }
  }
}
