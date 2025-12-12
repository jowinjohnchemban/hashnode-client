/**
 * GraphQL Query Builder for Hashnode API
 * 
 * **Query Construction Layer** providing reusable GraphQL query templates.
 * Uses field fragments for DRY (Don't Repeat Yourself) principle.
 * 
 * @module lib/api/hashnode/queries
 * 
 * @architecture
 * - **Builder Pattern**: Constructs complex GraphQL queries
 * - **Fragment Composition**: Reusable field sets
 * - **Type Safety**: Ensures queries match type definitions
 * 
 * @example Query Fragments
 * ```
 * POST_BASE_FIELDS    → Basic post data (id, title, excerpt)
 * POST_EXTENDED_FIELDS → Base + tags
 * POST_FULL_FIELDS    → Base + content (html/markdown)
 * ```
 * 
 * @see {@link https://apidocs.hashnode.com/} Hashnode GraphQL API Docs
 */

/** Base fields for blog posts */
const POST_BASE_FIELDS = `
  id
  title
  excerpt: brief
  slug
  coverImage { url }
  publishedAt
  readTimeInMinutes
  author { name username profilePicture }
`;

/** Extended fields including tags */
const POST_EXTENDED_FIELDS = `
  ${POST_BASE_FIELDS}
  tags { name slug }
`;

/** Full post fields including content */
const POST_FULL_FIELDS = `
  ${POST_BASE_FIELDS}
  content { html markdown text }
`;

/** Full post fields with tags */
const POST_FULL_EXTENDED_FIELDS = `
  ${POST_EXTENDED_FIELDS}
  content { html markdown text }
`;

export class HashnodeQueries {
  /**
   * Query to fetch publication details for SEO
   */
  static getPublication(): string {
    return `
      query GetPublication($host: String!) {
        publication(host: $host) {
          id
          title
          displayTitle
          descriptionSEO
          about { text }
          url
          author { name username profilePicture }
          favicon
          ogMetaData { image }
        }
      }
    `;
  }

  /**
   * Query to fetch multiple blog posts
   */
  static getBlogPosts(extended = true): string {
    const fields = extended ? POST_EXTENDED_FIELDS : POST_BASE_FIELDS;
    
    return `
      query GetBlogPosts($host: String!, $first: Int!) {
        publication(host: $host) {
          posts(first: $first) {
            edges {
              node {
                ${fields}
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;
  }

  /**
   * Query to fetch a single blog post by slug
   */
  static getBlogPostBySlug(extended = true): string {
    const fields = extended ? POST_FULL_EXTENDED_FIELDS : POST_FULL_FIELDS;
    
    return `
      query GetBlogPost($host: String!, $slug: String!) {
        publication(host: $host) {
          post(slug: $slug) {
            ${fields}
          }
        }
      }
    `;
  }
}
