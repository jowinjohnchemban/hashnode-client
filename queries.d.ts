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
export declare class HashnodeQueries {
    /**
     * Query to fetch publication details for SEO
     */
    static getPublication(): string;
    /**
     * Query to fetch multiple blog posts
     */
    static getBlogPosts(extended?: boolean): string;
    /**
     * Query to fetch a single blog post by slug
     */
    static getBlogPostBySlug(extended?: boolean): string;
    /**
     * Query to search posts within a publication
     */
    static searchPosts(): string;
    /**
     * Query to fetch series list
     */
    static getSeriesList(): string;
    /**
     * Query to fetch a single series by slug
     */
    static getSeries(): string;
    /**
     * Query to fetch posts in a series
     */
    static getSeriesPosts(): string;
    /**
     * Query to fetch static pages
     */
    static getStaticPages(): string;
    /**
     * Query to fetch a single static page
     */
    static getStaticPage(): string;
    /**
     * Query to fetch comments on a post
     */
    static getPostComments(): string;
    /**
     * Query to fetch recommended publications
     */
    static getRecommendedPublications(): string;
    /**
     * Query to fetch drafts
     */
    static getDrafts(): string;
    /**
     * Mutation to create a webhook
     */
    static createWebhook(): string;
    /**
     * Mutation to update a webhook
     */
    static updateWebhook(): string;
    /**
     * Mutation to delete a webhook
     */
    static deleteWebhook(): string;
    /**
     * Mutation to trigger webhook test
     */
    static triggerWebhookTest(): string;
}
//# sourceMappingURL=queries.d.ts.map