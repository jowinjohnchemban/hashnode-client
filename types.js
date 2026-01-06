"use strict";
/**
 * Type Definitions for Hashnode API
 *
 * **Data Models** representing Hashnode API responses.
 * These types provide compile-time safety and IDE autocomplete for
 * all Hashnode-related data structures.
 *
 * @module lib/api/hashnode/types
 *
 * @architecture
 * - **Interface Segregation**: Small, focused interfaces
 * - **Type Composition**: Complex types built from primitives
 * - **API Contracts**: Mirrors Hashnode GraphQL schema
 *
 * @types
 * - `BlogPost` - Basic blog post (list view)
 * - `BlogPostDetail` - Full post with content (detail view)
 * - `Publication` - Site-wide metadata
 * - `GraphQLResponse<T>` - Wrapper for GraphQL responses
 * - `Author`, `Tag`, `CoverImage` - Supporting types
 *
 * @example Type Usage
 * ```typescript
 * import type { BlogPost, BlogPostDetail } from './types';
 *
 * const post: BlogPost = {
 *   id: '1',
 *   title: 'Hello World',
 *   excerpt: 'My first post',
 *   // ...
 * };
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map