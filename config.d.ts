/**
 * Hashnode API Configuration
 *
 * Centralized configuration for the Hashnode adapter module.
 * All Hashnode-specific settings are defined here to make the adapter
 * easily configurable and portable.
 *
 * @module lib/api/hashnode/config
 *
 * @example Environment Setup
 * ```env
 * HASHNODE_PUBLICATION_HOST="yourblog.hashnode.dev"
 * ```
 */
export declare const HASHNODE_CONFIG: {
    /** GraphQL API endpoint */
    readonly API_URL: "https://gql.hashnode.com";
    /** Publication hostname */
    readonly PUBLICATION_HOST: string;
    /** Request timeout in milliseconds */
    readonly TIMEOUT_MS: 15000;
    /** Maximum posts per request */
    readonly MAX_POSTS_PER_REQUEST: 20;
    /** Default number of posts to fetch */
    readonly DEFAULT_POSTS_COUNT: 10;
};
export type HashnodeConfig = typeof HASHNODE_CONFIG;
//# sourceMappingURL=config.d.ts.map