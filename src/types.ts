/**
 * Public data types returned by the client. Field names and nullability follow
 * the Hashnode GraphQL schema for the fields this client queries.
 *
 * @module types
 */

/** Content in all formats Hashnode provides. */
export interface Content {
  html: string;
  markdown: string;
  text: string;
}

/** SEO overrides. */
export interface Seo {
  title: string | null;
  description: string | null;
}

/** Open Graph metadata. */
export interface OgMetaData {
  image: string | null;
}

/** A Hashnode user (post author, commenter, publication owner). */
export interface Author {
  id: string;
  name: string;
  username: string;
  profilePicture: string | null;
}

/** A tag attached to a post or draft. */
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

/** Cover image of a post or draft. */
export interface CoverImage {
  url: string | null;
}

/** Post fields returned by list queries. */
export interface BlogPost {
  id: string;
  cuid: string | null;
  slug: string;
  url: string;
  title: string;
  subtitle: string | null;
  /** Short summary of the post (Hashnode's `brief`). */
  excerpt: string;
  publishedAt: string;
  updatedAt: string | null;
  readTimeInMinutes: number;
  reactionCount: number;
  responseCount: number;
  coverImage: CoverImage | null;
  author: Author;
  tags: Tag[] | null;
}

/** Full post returned by single-post queries. */
export interface BlogPostDetail extends BlogPost {
  content: Content;
  canonicalUrl: string | null;
  seo: Seo | null;
  ogMetaData: OgMetaData | null;
  series: Pick<Series, 'id' | 'name' | 'slug'> | null;
}

/** Publication (blog) details. */
export interface Publication {
  id: string;
  title: string;
  displayTitle: string | null;
  url: string | null;
  canonicalURL: string | null;
  favicon: string | null;
  followersCount: number | null;
  about: Content | null;
  seo: Seo | null;
  ogMetaData: OgMetaData | null;
  author: Author;
}

/** A series of posts. */
export interface Series {
  id: string;
  cuid: string | null;
  name: string;
  slug: string;
  coverImage: string | null;
  description: Content | null;
  author: Author;
}

/** A static page such as "About". */
export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  hidden: boolean;
  content: Content;
  seo: Seo | null;
  ogMetaData: OgMetaData | null;
}

/** A comment on a post. */
export interface Comment {
  id: string;
  dateAdded: string;
  totalReactions: number;
  content: Content;
  author: Author;
}

/** A publication recommended by another publication. */
export interface RecommendedPublication {
  id: string;
  title: string;
  displayTitle: string | null;
  url: string | null;
  favicon: string | null;
  author: Author;
}

/** A draft post. Only visible to the token owner. */
export interface Draft {
  id: string;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  updatedAt: string;
  readTimeInMinutes: number | null;
  coverImage: CoverImage | null;
  tags: Tag[] | null;
  author: Author;
}

/** Cursor pagination state. */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

/** One page of a paginated list. */
export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
  /** Total number of matching documents, when Hashnode reports it. */
  totalDocuments: number | null;
}

/** Cursor pagination input. */
export interface PaginationOptions {
  /** Page size. Clamped to Hashnode's maximum. */
  first?: number;
  /** Cursor from a previous page's `pageInfo.endCursor`. */
  after?: string | null;
}

/** Options for listing publication posts. */
export interface ListPostsOptions extends PaginationOptions {
  /** Only return posts with at least one of these tag slugs. */
  tagSlugs?: string[];
}

/** Options for searching publication posts. */
export interface SearchPostsOptions extends PaginationOptions {
  /** Sort order. Hashnode orders by relevance when omitted. */
  sortBy?: 'DATE_PUBLISHED_ASC' | 'DATE_PUBLISHED_DESC';
}
