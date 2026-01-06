"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashnodeService = exports.HashnodeService = void 0;
const graphql_client_1 = require("./graphql-client");
const config_1 = require("./config");
const queries_1 = require("./queries");
/**
 * Service class for Hashnode API operations
 * Follows Single Responsibility Principle - handles only Hashnode API interactions
 */
class HashnodeService {
    constructor(apiUrl = config_1.HASHNODE_CONFIG.API_URL, publicationHost = config_1.HASHNODE_CONFIG.PUBLICATION_HOST, timeout = config_1.HASHNODE_CONFIG.TIMEOUT_MS) {
        this.apiUrl = apiUrl;
        this.publicationHost = publicationHost;
        this.timeout = timeout;
    }
    /**
     * Execute a GraphQL query with Next.js server-side caching
     */
    async executeQuery(query, variables) {
        return graphql_client_1.GraphQLClient.query(this.apiUrl, { query, variables }, {
            timeout: this.timeout,
        });
    }
    /**
     * Validate GraphQL response and throw on errors
     */
    validateResponse(response) {
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
    async getPublication() {
        try {
            const response = await this.executeQuery(queries_1.HashnodeQueries.getPublication(), { host: this.publicationHost });
            const data = this.validateResponse(response);
            return data.publication;
        }
        catch {
            return null;
        }
    }
    /**
     * Fetch blog posts with automatic fallback to basic query
     */
    async getBlogPosts(count) {
        const limit = Math.min(count ?? config_1.HASHNODE_CONFIG.DEFAULT_POSTS_COUNT, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST);
        const variables = { host: this.publicationHost, first: limit };
        try {
            // Try extended query first
            const response = await this.executeQuery(queries_1.HashnodeQueries.getBlogPosts(true), variables);
            const data = this.validateResponse(response);
            return data.publication.posts.edges.map((edge) => edge.node);
        }
        catch (error) {
            // Fallback to basic query if extended fails
            try {
                const response = await this.executeQuery(queries_1.HashnodeQueries.getBlogPosts(false), variables);
                const data = this.validateResponse(response);
                return data.publication.posts.edges.map((edge) => edge.node);
            }
            catch {
                // Return empty array on complete failure
                return [];
            }
            throw error;
        }
    }
    /**
     * Fetch a single blog post by slug
     */
    async getBlogPostBySlug(slug) {
        if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
            throw new Error('Invalid slug parameter');
        }
        const cleanSlug = slug.trim();
        const variables = { host: this.publicationHost, slug: cleanSlug };
        try {
            // Try extended query first
            const response = await this.executeQuery(queries_1.HashnodeQueries.getBlogPostBySlug(true), variables);
            const data = this.validateResponse(response);
            return data.publication.post;
        }
        catch (error) {
            // Fallback to basic query if extended fails (e.g., GraphQL errors)
            try {
                const response = await this.executeQuery(queries_1.HashnodeQueries.getBlogPostBySlug(false), variables);
                const data = this.validateResponse(response);
                return data.publication.post;
            }
            catch {
                // If both queries fail, throw the original error
                throw error;
            }
        }
    }
    /**
     * Search posts within the publication
     */
    async searchPosts(query, limit = 10) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        try {
            const variables = {
                first: Math.min(limit, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
                filter: {
                    publicationId: this.publicationHost,
                    query: query.trim(),
                },
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.searchPosts(), variables);
            const data = this.validateResponse(response);
            return data.searchPostsOfPublication.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch list of series in the publication
     */
    async getSeriesList(limit = 10) {
        try {
            const variables = {
                host: this.publicationHost,
                first: Math.min(limit, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getSeriesList(), variables);
            const data = this.validateResponse(response);
            return data.publication.seriesList.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch a single series by slug
     */
    async getSeries(slug) {
        if (!slug || slug.trim().length === 0) {
            return null;
        }
        try {
            const variables = { host: this.publicationHost, slug: slug.trim() };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getSeries(), variables);
            const data = this.validateResponse(response);
            return data.publication.series;
        }
        catch {
            return null;
        }
    }
    /**
     * Fetch posts in a series
     */
    async getSeriesPosts(seriesSlug, limit = 10) {
        if (!seriesSlug || seriesSlug.trim().length === 0) {
            return [];
        }
        try {
            const variables = {
                host: this.publicationHost,
                seriesSlug: seriesSlug.trim(),
                first: Math.min(limit, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getSeriesPosts(), variables);
            const data = this.validateResponse(response);
            return data.publication.series.posts.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch static pages from the publication
     */
    async getStaticPages(limit = 10) {
        try {
            const variables = {
                host: this.publicationHost,
                first: Math.min(limit, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getStaticPages(), variables);
            const data = this.validateResponse(response);
            return data.publication.staticPages.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch a single static page by slug
     */
    async getStaticPage(slug) {
        if (!slug || slug.trim().length === 0) {
            return null;
        }
        try {
            const variables = { host: this.publicationHost, slug: slug.trim() };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getStaticPage(), variables);
            const data = this.validateResponse(response);
            return data.publication.staticPage;
        }
        catch {
            return null;
        }
    }
    /**
     * Fetch comments for a post
     */
    async getPostComments(postId, limit = 20) {
        if (!postId || postId.trim().length === 0) {
            return [];
        }
        try {
            const variables = {
                postId: postId.trim(),
                first: Math.min(limit, 50), // Max 50 comments per page
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getPostComments(), variables);
            const data = this.validateResponse(response);
            return data.post.comments.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch recommended publications
     */
    async getRecommendedPublications() {
        try {
            const variables = { host: this.publicationHost };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getRecommendedPublications(), variables);
            const data = this.validateResponse(response);
            return data.publication.recommendedPublications;
        }
        catch {
            return [];
        }
    }
    /**
     * Fetch drafts from the publication (requires authentication)
     */
    async getDrafts(limit = 10) {
        try {
            const variables = {
                host: this.publicationHost,
                first: Math.min(limit, config_1.HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST),
            };
            const response = await this.executeQuery(queries_1.HashnodeQueries.getDrafts(), variables);
            const data = this.validateResponse(response);
            return data.publication.drafts.edges.map((edge) => edge.node);
        }
        catch {
            return [];
        }
    }
}
exports.HashnodeService = HashnodeService;
/**
 * Singleton instance for application-wide use
 */
exports.hashnodeService = new HashnodeService();
//# sourceMappingURL=service.js.map