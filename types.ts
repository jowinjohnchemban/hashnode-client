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

/** Base blog post interface */
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  coverImage?: CoverImage;
  publishedAt: string;
  readTimeInMinutes: number;
  author: Author;
  tags?: Tag[];
}

/** Detailed blog post with content */
export interface BlogPostDetail extends BlogPost {
  content?: PostContent;
}

/** Cover image data */
export interface CoverImage {
  url?: string;
}

/** Author information */
export interface Author {
  name: string;
  username: string;
  profilePicture?: string;
}

/** Tag data */
export interface Tag {
  name: string;
  slug?: string;
}

/** Post content in multiple formats */
export interface PostContent {
  html?: string;
  markdown?: string;
  text?: string;
}

/** GraphQL response wrapper */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/** GraphQL error structure */
export interface GraphQLError {
  message: string;
  extensions?: {
    code: string;
  };
}

/** Hashnode publication response */
export interface PublicationPostsResponse {
  publication: {
    posts: {
      edges: Array<{
        node: BlogPost;
      }>;
      pageInfo: PageInfo;
    };
  };
}

/** Hashnode single post response */
export interface PublicationPostResponse {
  publication: {
    post: BlogPostDetail | null;
  };
}

/** Pagination info */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

/** Hashnode publication details */
export interface Publication {
  id: string;
  title: string;
  displayTitle?: string;
  descriptionSEO?: string;
  about?: {
    text?: string;
  };
  url: string;
  author?: {
    name: string;
    username: string;
    profilePicture?: string;
  };
  favicon?: string;
  ogMetaData?: {
    image?: string;
  };
}

/** Hashnode publication response */
export interface PublicationResponse {
  publication: Publication | null;
}

// ============================================
// WEBHOOKS
// ============================================

/** Webhook event types */
export type WebhookEvent = 
  | 'POST_PUBLISHED'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'STATIC_PAGE_PUBLISHED'
  | 'STATIC_PAGE_UPDATED'
  | 'STATIC_PAGE_DELETED';

/** Webhook configuration */
export interface Webhook {
  id: string;
  publication: Publication;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: string;
  updatedAt?: string;
}

/** Webhook response */
export interface WebhookResponse {
  webhook: Webhook | null;
}

/** Webhook list response */
export interface WebhooksResponse {
  publication: {
    webhooks: Webhook[];
  };
}

/** Webhook message for delivery tracking */
export interface WebhookMessage {
  id: string;
  webhook: Webhook;
  request: WebhookMessageRequest;
  response?: WebhookMessageResponse;
  createdAt: string;
}

/** Webhook message request details */
export interface WebhookMessageRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Webhook message response details */
export interface WebhookMessageResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// ============================================
// SERIES
// ============================================

/** Series information */
export interface Series {
  id: string;
  name: string;
  createdAt: string;
  description?: {
    text?: string;
    html?: string;
    markdown?: string;
  };
  coverImage?: string;
  author: Author;
  cuid: string;
  slug: string;
  sortOrder: 'ASCENDING' | 'DESCENDING';
}

/** Series connection response */
export interface SeriesListResponse {
  publication: {
    seriesList: {
      edges: Array<{
        node: Series;
        cursor: string;
      }>;
      pageInfo: PageInfo;
      totalDocuments: number;
    };
  };
}

/** Single series response */
export interface SeriesResponse {
  publication: {
    series: Series | null;
  };
}

// ============================================
// SEARCH
// ============================================

/** Search posts filter */
export interface SearchPostsFilter {
  publicationId: string;
  query: string;
}

/** Search posts response */
export interface SearchPostsResponse {
  searchPostsOfPublication: {
    edges: Array<{
      node: BlogPost;
      cursor: string;
    }>;
    pageInfo: PageInfo;
  };
}

// ============================================
// STATIC PAGES
// ============================================

/** Static page */
export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: PostContent;
  hidden: boolean;
  ogMetaData?: {
    image?: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
}

/** Static pages response */
export interface StaticPagesResponse {
  publication: {
    staticPages: {
      edges: Array<{
        node: StaticPage;
        cursor: string;
      }>;
      pageInfo: PageInfo;
      totalDocuments: number;
    };
  };
}

/** Single static page response */
export interface StaticPageResponse {
  publication: {
    staticPage: StaticPage | null;
  };
}

// ============================================
// COMMENTS & DISCUSSIONS
// ============================================

/** Comment on a post */
export interface Comment {
  id: string;
  content: PostContent;
  author: Author;
  dateAdded: string;
  totalReactions: number;
  myTotalReactions: number;
}

/** Reply to a comment */
export interface Reply extends Comment {
  parentCommentId: string;
}

/** Comments response */
export interface CommentsResponse {
  post: {
    comments: {
      edges: Array<{
        node: Comment;
        cursor: string;
      }>;
      pageInfo: PageInfo;
      totalDocuments: number;
    };
  };
}

// ============================================
// RECOMMENDATIONS
// ============================================

/** Recommended publication edge */
export interface RecommendedPublicationEdge {
  node: Publication;
  totalFollowersGained: number;
}

/** Recommended publications response */
export interface RecommendedPublicationsResponse {
  publication: {
    recommendedPublications: RecommendedPublicationEdge[];
    totalRecommendedPublications: number;
  };
}

// ============================================
// DRAFTS
// ============================================

/** Draft post */
export interface Draft {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  author: Author;
  tags?: Tag[];
  coverImage?: CoverImage;
  content?: PostContent;
  dateUpdated: string;
  updatedAt: string;
}

/** Drafts response */
export interface DraftsResponse {
  publication: {
    drafts: {
      edges: Array<{
        node: Draft;
        cursor: string;
      }>;
      pageInfo: PageInfo;
      totalDocuments: number;
    };
  };
}

// ============================================
// NEWSLETTER
// ============================================

/** Newsletter subscription status */
export type NewsletterSubscribeStatus = 'SUBSCRIBED' | 'PENDING' | 'UNSUBSCRIBED';

/** Newsletter subscriber */
export interface NewsletterSubscriber {
  email: string;
  status: NewsletterSubscribeStatus;
  subscribedAt: string;
}

// ============================================
// ANALYTICS & STATS
// ============================================

/** Post views and analytics */
export interface PostStats {
  views: number;
  reactions: number;
  responseCount: number;
  replyCount: number;
}

// ============================================
// PAGINATION HELPERS
// ============================================

/** Cursor-based pagination variables */
export interface PaginationVariables {
  first: number;
  after?: string;
}

/** Offset-based pagination variables */
export interface OffsetPaginationVariables {
  pageSize: number;
  page: number;
}
