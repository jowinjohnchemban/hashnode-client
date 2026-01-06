"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashnodeQueries = void 0;
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
class HashnodeQueries {
    /**
     * Query to fetch publication details for SEO
     */
    static getPublication() {
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
    static getBlogPosts(extended = true) {
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
    static getBlogPostBySlug(extended = true) {
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
    /**
     * Query to search posts within a publication
     */
    static searchPosts() {
        return `
      query SearchPostsOfPublication($first: Int!, $after: String, $filter: SearchPostsOfPublicationFilter!) {
        searchPostsOfPublication(first: $first, after: $after, filter: $filter) {
          edges {
            node {
              ${POST_EXTENDED_FIELDS}
            }
            cursor
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    }
    /**
     * Query to fetch series list
     */
    static getSeriesList() {
        return `
      query GetSeriesList($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          seriesList(first: $first, after: $after) {
            edges {
              node {
                id name slug coverImage createdAt
                description { text html markdown }
                author { name username profilePicture }
                cuid sortOrder
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
            totalDocuments
          }
        }
      }
    `;
    }
    /**
     * Query to fetch a single series by slug
     */
    static getSeries() {
        return `
      query GetSeries($host: String!, $slug: String!) {
        publication(host: $host) {
          series(slug: $slug) {
            id name slug coverImage createdAt
            description { text html markdown }
            author { name username profilePicture }
            cuid sortOrder
          }
        }
      }
    `;
    }
    /**
     * Query to fetch posts in a series
     */
    static getSeriesPosts() {
        return `
      query GetSeriesPosts($host: String!, $seriesSlug: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          series(slug: $seriesSlug) {
            posts(first: $first, after: $after) {
              edges {
                node {
                  ${POST_EXTENDED_FIELDS}
                }
                cursor
              }
              pageInfo { hasNextPage endCursor }
              totalDocuments
            }
          }
        }
      }
    `;
    }
    /**
     * Query to fetch static pages
     */
    static getStaticPages() {
        return `
      query GetStaticPages($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          staticPages(first: $first, after: $after) {
            edges {
              node {
                id title slug
                content { html markdown text }
                hidden
                ogMetaData { image }
                seo { title description }
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
            totalDocuments
          }
        }
      }
    `;
    }
    /**
     * Query to fetch a single static page
     */
    static getStaticPage() {
        return `
      query GetStaticPage($host: String!, $slug: String!) {
        publication(host: $host) {
          staticPage(slug: $slug) {
            id title slug
            content { html markdown text }
            hidden
            ogMetaData { image }
            seo { title description }
          }
        }
      }
    `;
    }
    /**
     * Query to fetch comments on a post
     */
    static getPostComments() {
        return `
      query GetPostComments($postId: ID!, $first: Int!, $after: String) {
        post(id: $postId) {
          comments(first: $first, after: $after) {
            edges {
              node {
                id
                content { html markdown text }
                author { name username profilePicture }
                dateAdded
                totalReactions
                myTotalReactions
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
            totalDocuments
          }
        }
      }
    `;
    }
    /**
     * Query to fetch recommended publications
     */
    static getRecommendedPublications() {
        return `
      query GetRecommendedPublications($host: String!) {
        publication(host: $host) {
          recommendedPublications {
            node {
              id title displayTitle url
              author { name username profilePicture }
            }
            totalFollowersGained
          }
          totalRecommendedPublications
        }
      }
    `;
    }
    /**
     * Query to fetch drafts
     */
    static getDrafts() {
        return `
      query GetDrafts($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          drafts(first: $first, after: $after) {
            edges {
              node {
                id slug title subtitle
                author { name username profilePicture }
                tags { name slug }
                coverImage { url }
                dateUpdated updatedAt
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
            totalDocuments
          }
        }
      }
    `;
    }
    /**
     * Mutation to create a webhook
     */
    static createWebhook() {
        return `
      mutation CreateWebhook($input: CreateWebhookInput!) {
        createWebhook(input: $input) {
          webhook {
            id url events secret createdAt updatedAt
            publication { id title }
          }
        }
      }
    `;
    }
    /**
     * Mutation to update a webhook
     */
    static updateWebhook() {
        return `
      mutation UpdateWebhook($input: UpdateWebhookInput!) {
        updateWebhook(input: $input) {
          webhook {
            id url events secret createdAt updatedAt
          }
        }
      }
    `;
    }
    /**
     * Mutation to delete a webhook
     */
    static deleteWebhook() {
        return `
      mutation DeleteWebhook($id: ID!) {
        deleteWebhook(id: $id) {
          webhook { id }
        }
      }
    `;
    }
    /**
     * Mutation to trigger webhook test
     */
    static triggerWebhookTest() {
        return `
      mutation TriggerWebhookTest($input: TriggerWebhookTestInput!) {
        triggerWebhookTest(input: $input) {
          webhook { id url events }
        }
      }
    `;
    }
}
exports.HashnodeQueries = HashnodeQueries;
//# sourceMappingURL=queries.js.map