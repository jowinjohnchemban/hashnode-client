/**
 * GraphQL documents used by the client.
 *
 * @module queries
 * @internal
 * @see https://github.com/Hashnode/gql-skill for the Hashnode schema
 */

const AUTHOR = 'id name username profilePicture';
const CONTENT = 'html markdown text';
const PAGE_INFO = 'pageInfo { hasNextPage endCursor }';

const POST_SUMMARY = `
  id cuid slug url title subtitle
  excerpt: brief
  publishedAt updatedAt readTimeInMinutes reactionCount responseCount
  coverImage { url }
  author { ${AUTHOR} }
  tags { id name slug }
`;

const POST_DETAIL = `
  ${POST_SUMMARY}
  content { ${CONTENT} }
  canonicalUrl
  seo { title description }
  ogMetaData { image }
  series { id name slug }
`;

const SERIES = `
  id cuid name slug coverImage
  description { ${CONTENT} }
  author { ${AUTHOR} }
`;

const STATIC_PAGE = `
  id title slug hidden
  content { ${CONTENT} }
  seo { title description }
  ogMetaData { image }
`;

export const PUBLICATION_QUERY = `
  query Publication($host: String!) {
    publication(host: $host) {
      id title displayTitle url canonicalURL favicon followersCount
      about { ${CONTENT} }
      seo { title description }
      ogMetaData { image }
      author { ${AUTHOR} }
    }
  }
`;

export const POSTS_QUERY = `
  query Posts($host: String!, $first: Int!, $after: String, $filter: PublicationPostConnectionFilter) {
    publication(host: $host) {
      posts(first: $first, after: $after, filter: $filter) {
        edges { node { ${POST_SUMMARY} } }
        ${PAGE_INFO}
        totalDocuments
      }
    }
  }
`;

export const POST_BY_SLUG_QUERY = `
  query PostBySlug($host: String!, $slug: String!) {
    publication(host: $host) {
      post(slug: $slug) { ${POST_DETAIL} }
    }
  }
`;

export const POST_BY_ID_QUERY = `
  query PostById($id: ID!) {
    post(id: $id) { ${POST_DETAIL} }
  }
`;

export const SEARCH_POSTS_QUERY = `
  query SearchPosts($first: Int!, $after: String, $sortBy: PostSortBy, $filter: SearchPostsOfPublicationFilter!) {
    searchPostsOfPublication(first: $first, after: $after, sortBy: $sortBy, filter: $filter) {
      edges { node { ${POST_SUMMARY} } }
      ${PAGE_INFO}
    }
  }
`;

export const SERIES_LIST_QUERY = `
  query SeriesList($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      seriesList(first: $first, after: $after) {
        edges { node { ${SERIES} } }
        ${PAGE_INFO}
      }
    }
  }
`;

export const SERIES_QUERY = `
  query Series($host: String!, $slug: String!) {
    publication(host: $host) {
      series(slug: $slug) { ${SERIES} }
    }
  }
`;

export const SERIES_POSTS_QUERY = `
  query SeriesPosts($host: String!, $slug: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      series(slug: $slug) {
        posts(first: $first, after: $after) {
          edges { node { ${POST_SUMMARY} } }
          ${PAGE_INFO}
          totalDocuments
        }
      }
    }
  }
`;

export const STATIC_PAGES_QUERY = `
  query StaticPages($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      staticPages(first: $first, after: $after) {
        edges { node { ${STATIC_PAGE} } }
        ${PAGE_INFO}
      }
    }
  }
`;

export const STATIC_PAGE_QUERY = `
  query StaticPage($host: String!, $slug: String!) {
    publication(host: $host) {
      staticPage(slug: $slug) { ${STATIC_PAGE} }
    }
  }
`;

export const POST_COMMENTS_QUERY = `
  query PostComments($id: ID!, $first: Int!, $after: String) {
    post(id: $id) {
      comments(first: $first, after: $after) {
        edges { node { id dateAdded totalReactions content { ${CONTENT} } author { ${AUTHOR} } } }
        ${PAGE_INFO}
      }
    }
  }
`;

export const RECOMMENDED_PUBLICATIONS_QUERY = `
  query RecommendedPublications($host: String!) {
    publication(host: $host) {
      recommendedPublications {
        node { id title displayTitle url favicon author { ${AUTHOR} } }
      }
    }
  }
`;

export const DRAFTS_QUERY = `
  query Drafts($host: String!, $first: Int!, $after: String) {
    publication(host: $host) {
      drafts(first: $first, after: $after) {
        edges {
          node {
            id slug title subtitle updatedAt readTimeInMinutes
            coverImage { url }
            tags { id name slug }
            author { ${AUTHOR} }
          }
        }
        ${PAGE_INFO}
        totalDocuments
      }
    }
  }
`;
