/**
 * Typed client for the Hashnode GraphQL API.
 *
 * @module client
 */

import {
  DEFAULT_PAGE_SIZE,
  MAX_DRAFT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  resolveConfig,
  type HashnodeClientOptions,
  type ResolvedConfig,
} from './config';
import { InFlightRequests, isQueryOperation } from './dedupe';
import { HashnodeError, isHashnodeError } from './errors';
import * as Q from './queries';
import { executeGraphQL, type RequestOptions } from './transport';
import type {
  BlogPost,
  BlogPostDetail,
  Comment,
  Draft,
  ListPostsOptions,
  Page,
  PageInfo,
  PaginationOptions,
  Publication,
  RecommendedPublication,
  SearchPostsOptions,
  Series,
  StaticPage,
} from './types';

interface Connection<T> {
  edges: { node: T }[];
  pageInfo: PageInfo;
  totalDocuments?: number | null;
}

interface PublicationData<T> {
  publication: T | null;
}

const EMPTY_PAGE_INFO: PageInfo = { hasNextPage: false, endCursor: null };

function toPage<T>(connection: Connection<T> | null | undefined): Page<T> {
  if (!connection) return { items: [], pageInfo: EMPTY_PAGE_INFO, totalDocuments: 0 };
  return {
    items: connection.edges.map((edge) => edge.node),
    pageInfo: connection.pageInfo,
    totalDocuments: connection.totalDocuments ?? null,
  };
}

function pageSize(first: number | undefined, max: number): number {
  if (first === undefined) return Math.min(DEFAULT_PAGE_SIZE, max);
  if (!Number.isInteger(first) || first < 1) {
    throw new RangeError(`\`first\` must be a positive integer, received ${first}`);
  }
  return Math.min(first, max);
}

/** Hashnode reports some missing items as a `NOT_FOUND` error rather than `null`. */
async function orIfNotFound<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await promise;
  } catch (error) {
    if (isHashnodeError(error) && error.code === 'NOT_FOUND') return fallback;
    throw error;
  }
}

function requireNonEmpty(value: string, name: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new TypeError(`\`${name}\` must be a non-empty string`);
  return trimmed;
}

/**
 * Client for one Hashnode publication.
 *
 * Methods throw {@link HashnodeError} on failure. Single-item lookups return
 * `null` when the item does not exist.
 *
 * Hashnode requires the publication to be on a Pro plan for API access; other
 * publications fail with error code `FORBIDDEN`.
 *
 * @example
 * ```ts
 * const hashnode = new HashnodeClient({ host: 'blog.example.com' });
 * const { items, pageInfo } = await hashnode.getPosts({ first: 20 });
 * ```
 */
export class HashnodeClient {
  readonly #config: ResolvedConfig;
  readonly #inFlight = new InFlightRequests();
  #publicationId: Promise<string> | undefined;

  constructor(options: HashnodeClientOptions = {}) {
    this.#config = resolveConfig(options);
    if (this.#config.publicationId) {
      this.#publicationId = Promise.resolve(this.#config.publicationId);
    }
  }

  /** The configured publication host, if any. */
  get host(): string | undefined {
    return this.#config.host;
  }

  /**
   * Runs an arbitrary GraphQL operation against the configured endpoint.
   * Use this for fields the typed methods do not cover.
   *
   * Identical queries made at the same time share one API request (see the
   * `dedupe` option). Mutations are always sent individually.
   */
  request<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    if (!this.#config.dedupe || !isQueryOperation(query)) {
      return executeGraphQL<T>(this.#config, query, variables, options);
    }
    const cache = options.cache ?? this.#config.cache;
    const next = options.next ?? this.#config.next;
    const key = JSON.stringify([query, variables, cache ?? null, next ?? null]);
    // Each caller's signal is applied separately; the shared request is only
    // cancelled once every caller waiting for it has aborted.
    return this.#inFlight.run(
      key,
      (signal) => executeGraphQL<T>(this.#config, query, variables, { cache, next, signal }),
      options.signal,
    );
  }

  #requireHost(): string {
    const { host } = this.#config;
    if (!host) {
      throw new HashnodeError(
        'No publication host configured. Pass `host` or set HASHNODE_PUBLICATION_HOST.',
        { code: 'CONFIG_ERROR' },
      );
    }
    return host;
  }

  async #publication<T>(
    query: string,
    variables: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T | null> {
    const data = await this.request<PublicationData<T>>(
      query,
      { host: this.#requireHost(), ...variables },
      options,
    );
    return data.publication;
  }

  /** Fetches publication details. Returns `null` if the host is unknown. */
  getPublication(options?: RequestOptions): Promise<Publication | null> {
    return orIfNotFound(this.#publication<Publication>(Q.PUBLICATION_QUERY, {}, options), null);
  }

  /** Returns the publication ID, fetching it once from the host when not configured. */
  getPublicationId(options?: RequestOptions): Promise<string> {
    this.#publicationId ??= this.getPublication(options).then(
      (publication) => {
        if (!publication) {
          throw new HashnodeError(`Publication not found for host "${this.#requireHost()}"`, {
            code: 'NOT_FOUND',
          });
        }
        return publication.id;
      },
      (error: unknown) => {
        // Allow a later call to retry after a transient failure.
        this.#publicationId = undefined;
        throw error;
      },
    );
    return this.#publicationId;
  }

  /** Lists published posts, newest first. */
  async getPosts(
    options: ListPostsOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<BlogPost>> {
    const publication = await this.#publication<{ posts: Connection<BlogPost> }>(
      Q.POSTS_QUERY,
      {
        first: pageSize(options.first, MAX_PAGE_SIZE),
        after: options.after ?? null,
        filter: options.tagSlugs?.length ? { tagSlugs: options.tagSlugs } : null,
      },
      requestOptions,
    );
    return toPage(publication?.posts);
  }

  /**
   * Iterates over every published post, fetching pages lazily.
   *
   * @example
   * ```ts
   * for await (const post of hashnode.iteratePosts()) console.log(post.slug);
   * ```
   */
  async *iteratePosts(
    options: Omit<ListPostsOptions, 'after'> = {},
    requestOptions?: RequestOptions,
  ): AsyncGenerator<BlogPost, void, undefined> {
    let after: string | null = null;
    const seen = new Set<string>();
    do {
      const page: Page<BlogPost> = await this.getPosts(
        { ...options, first: options.first ?? MAX_PAGE_SIZE, after },
        requestOptions,
      );
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      if (after !== null) {
        // Guard against a cursor that never advances. Checked before yielding
        // so a repeated page's posts aren't emitted twice.
        if (seen.has(after)) {
          throw new HashnodeError('Pagination cursor repeated; stopping to avoid a loop', {
            code: 'INVALID_RESPONSE',
          });
        }
        seen.add(after);
      }
      yield* page.items;
    } while (after);
  }

  /** Fetches a post by its slug. */
  async getPost(slug: string, options?: RequestOptions): Promise<BlogPostDetail | null> {
    const publication = await orIfNotFound(
      this.#publication<{ post: BlogPostDetail | null }>(
        Q.POST_BY_SLUG_QUERY,
        { slug: requireNonEmpty(slug, 'slug') },
        options,
      ),
      null,
    );
    return publication?.post ?? null;
  }

  /** Fetches a post by its ID, for example from a webhook payload. */
  async getPostById(id: string, options?: RequestOptions): Promise<BlogPostDetail | null> {
    const data = await orIfNotFound(
      this.request<{ post: BlogPostDetail | null }>(
        Q.POST_BY_ID_QUERY,
        { id: requireNonEmpty(id, 'id') },
        options,
      ),
      null,
    );
    return data?.post ?? null;
  }

  /** Full-text search within the publication. */
  async searchPosts(
    query: string,
    options: SearchPostsOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<BlogPost>> {
    const text = requireNonEmpty(query, 'query');
    const publicationId = await this.getPublicationId(requestOptions);
    const data = await this.request<{ searchPostsOfPublication: Connection<BlogPost> }>(
      Q.SEARCH_POSTS_QUERY,
      {
        first: pageSize(options.first, MAX_PAGE_SIZE),
        after: options.after ?? null,
        sortBy: options.sortBy ?? null,
        filter: { publicationId, query: text },
      },
      requestOptions,
    );
    return toPage(data.searchPostsOfPublication);
  }

  /** Lists the publication's series. */
  async getSeriesList(
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<Series>> {
    const publication = await this.#publication<{ seriesList: Connection<Series> }>(
      Q.SERIES_LIST_QUERY,
      { first: pageSize(options.first, MAX_PAGE_SIZE), after: options.after ?? null },
      requestOptions,
    );
    return toPage(publication?.seriesList);
  }

  /** Fetches a series by its slug. */
  async getSeries(slug: string, options?: RequestOptions): Promise<Series | null> {
    const publication = await orIfNotFound(
      this.#publication<{ series: Series | null }>(
        Q.SERIES_QUERY,
        { slug: requireNonEmpty(slug, 'slug') },
        options,
      ),
      null,
    );
    return publication?.series ?? null;
  }

  /** Lists posts in a series. Returns an empty page if the series does not exist. */
  async getSeriesPosts(
    slug: string,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<BlogPost>> {
    const publication = await orIfNotFound(
      this.#publication<{ series: { posts: Connection<BlogPost> } | null }>(
        Q.SERIES_POSTS_QUERY,
        {
          slug: requireNonEmpty(slug, 'slug'),
          first: pageSize(options.first, MAX_PAGE_SIZE),
          after: options.after ?? null,
        },
        requestOptions,
      ),
      null,
    );
    return toPage(publication?.series?.posts);
  }

  /** Lists the publication's static pages. */
  async getStaticPages(
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<StaticPage>> {
    const publication = await this.#publication<{ staticPages: Connection<StaticPage> }>(
      Q.STATIC_PAGES_QUERY,
      { first: pageSize(options.first, MAX_PAGE_SIZE), after: options.after ?? null },
      requestOptions,
    );
    return toPage(publication?.staticPages);
  }

  /** Fetches a static page by its slug. */
  async getStaticPage(slug: string, options?: RequestOptions): Promise<StaticPage | null> {
    const publication = await orIfNotFound(
      this.#publication<{ staticPage: StaticPage | null }>(
        Q.STATIC_PAGE_QUERY,
        { slug: requireNonEmpty(slug, 'slug') },
        options,
      ),
      null,
    );
    return publication?.staticPage ?? null;
  }

  /** Lists comments on a post. Returns an empty page if the post does not exist. */
  async getPostComments(
    postId: string,
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<Comment>> {
    const data = await orIfNotFound(
      this.request<{ post: { comments: Connection<Comment> } | null }>(
        Q.POST_COMMENTS_QUERY,
        {
          id: requireNonEmpty(postId, 'postId'),
          first: pageSize(options.first, MAX_PAGE_SIZE),
          after: options.after ?? null,
        },
        requestOptions,
      ),
      null,
    );
    return toPage(data?.post?.comments);
  }

  /** Lists publications this publication recommends. */
  async getRecommendedPublications(options?: RequestOptions): Promise<RecommendedPublication[]> {
    const publication = await this.#publication<{
      recommendedPublications: { node: RecommendedPublication }[];
    }>(Q.RECOMMENDED_PUBLICATIONS_QUERY, {}, options);
    return publication?.recommendedPublications.map((edge) => edge.node) ?? [];
  }

  /** Lists the token owner's drafts in the publication. Requires a token. */
  async getDrafts(
    options: PaginationOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<Page<Draft>> {
    if (!this.#config.token) {
      throw new HashnodeError(
        'Drafts require an access token. Pass `token` or set HASHNODE_ACCESS_TOKEN.',
        { code: 'UNAUTHENTICATED' },
      );
    }
    const publication = await this.#publication<{ drafts: Connection<Draft> }>(
      Q.DRAFTS_QUERY,
      { first: pageSize(options.first, MAX_DRAFT_PAGE_SIZE), after: options.after ?? null },
      requestOptions,
    );
    return toPage(publication?.drafts);
  }
}

/** Creates a {@link HashnodeClient}. */
export function createHashnodeClient(options?: HashnodeClientOptions): HashnodeClient {
  return new HashnodeClient(options);
}
