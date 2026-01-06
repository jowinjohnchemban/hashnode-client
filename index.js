"use strict";
/**
 * Hashnode API Integration Module
 *
 * **Standalone Adapter/Handler** for Hashnode GraphQL API.
 * This module encapsulates all Hashnode-specific logic and can be replaced
 * with another blogging platform adapter without affecting consuming code.
 *
 * @module lib/api/hashnode
 * @see {@link ./README.md} for detailed architecture documentation
 *
 * @example Basic Usage
 * ```typescript
 * import { getBlogPosts, getBlogPostBySlug } from '@/lib/api/hashnode';
 *
 * const posts = await getBlogPosts(10);
 * const post = await getBlogPostBySlug('my-post-slug');
 * ```
 *
 * @architecture
 * - Facade Pattern: Simplified API for consumers
 * - Service Layer: Business logic encapsulation
 * - Repository Pattern: Data access abstraction
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashnodeService = exports.HashnodeService = void 0;
exports.getPublication = getPublication;
exports.getBlogPosts = getBlogPosts;
exports.getBlogPostBySlug = getBlogPostBySlug;
exports.searchPosts = searchPosts;
exports.getSeriesList = getSeriesList;
exports.getSeries = getSeries;
exports.getSeriesPosts = getSeriesPosts;
exports.getStaticPages = getStaticPages;
exports.getStaticPage = getStaticPage;
exports.getPostComments = getPostComments;
exports.getRecommendedPublications = getRecommendedPublications;
exports.getDrafts = getDrafts;
__exportStar(require("./types"), exports);
__exportStar(require("./config"), exports);
var service_1 = require("./service");
Object.defineProperty(exports, "HashnodeService", { enumerable: true, get: function () { return service_1.HashnodeService; } });
Object.defineProperty(exports, "hashnodeService", { enumerable: true, get: function () { return service_1.hashnodeService; } });
// Re-export webhook utilities
__exportStar(require("./webhooks"), exports);
/**
 * Convenience functions using the singleton service
 */
const service_2 = require("./service");
/**
 * Fetch publication details
 * @returns Publication details or null on error
 */
async function getPublication() {
    try {
        return await service_2.hashnodeService.getPublication();
    }
    catch {
        return null;
    }
}
/**
 * Fetch blog posts from Hashnode
 * @param count - Number of posts to fetch
 * @returns Array of blog posts or empty array on error
 */
async function getBlogPosts(count) {
    try {
        return await service_2.hashnodeService.getBlogPosts(count);
    }
    catch {
        return [];
    }
}
/**
 * Fetch a single blog post by slug
 * @param slug - Blog post slug
 * @returns Blog post or null if not found/error
 */
async function getBlogPostBySlug(slug) {
    try {
        return await service_2.hashnodeService.getBlogPostBySlug(slug);
    }
    catch {
        return null;
    }
}
/**
 * Search posts within the publication
 * @param query - Search query string
 * @param limit - Number of results to return
 * @returns Array of matching blog posts or empty array on error
 */
async function searchPosts(query, limit) {
    try {
        return await service_2.hashnodeService.searchPosts(query, limit);
    }
    catch {
        return [];
    }
}
/**
 * Fetch series list from the publication
 * @param limit - Number of series to fetch
 * @returns Array of series or empty array on error
 */
async function getSeriesList(limit) {
    try {
        return await service_2.hashnodeService.getSeriesList(limit);
    }
    catch {
        return [];
    }
}
/**
 * Fetch a single series by slug
 * @param slug - Series slug
 * @returns Series or null if not found/error
 */
async function getSeries(slug) {
    try {
        return await service_2.hashnodeService.getSeries(slug);
    }
    catch {
        return null;
    }
}
/**
 * Fetch posts within a series
 * @param seriesSlug - Series slug
 * @param limit - Number of posts to fetch
 * @returns Array of posts in the series or empty array on error
 */
async function getSeriesPosts(seriesSlug, limit) {
    try {
        return await service_2.hashnodeService.getSeriesPosts(seriesSlug, limit);
    }
    catch {
        return [];
    }
}
/**
 * Fetch static pages from the publication
 * @param limit - Number of pages to fetch
 * @returns Array of static pages or empty array on error
 */
async function getStaticPages(limit) {
    try {
        return await service_2.hashnodeService.getStaticPages(limit);
    }
    catch {
        return [];
    }
}
/**
 * Fetch a single static page by slug
 * @param slug - Static page slug
 * @returns Static page or null if not found/error
 */
async function getStaticPage(slug) {
    try {
        return await service_2.hashnodeService.getStaticPage(slug);
    }
    catch {
        return null;
    }
}
/**
 * Fetch comments for a post
 * @param postId - Post ID
 * @param limit - Number of comments to fetch
 * @returns Array of comments or empty array on error
 */
async function getPostComments(postId, limit) {
    try {
        return await service_2.hashnodeService.getPostComments(postId, limit);
    }
    catch {
        return [];
    }
}
/**
 * Fetch recommended publications
 * @returns Array of recommended publications or empty array on error
 */
async function getRecommendedPublications() {
    try {
        return await service_2.hashnodeService.getRecommendedPublications();
    }
    catch {
        return [];
    }
}
/**
 * Fetch drafts from the publication (requires authentication)
 * @param limit - Number of drafts to fetch
 * @returns Array of drafts or empty array on error
 */
async function getDrafts(limit) {
    try {
        return await service_2.hashnodeService.getDrafts(limit);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=index.js.map