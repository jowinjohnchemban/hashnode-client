import { afterEach, describe, expect, it, vi } from 'vitest';
import { HashnodeClient, HashnodeError, MAX_DRAFT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../src';
import { connection, json, mockFetch } from './helpers';

const HOST = 'blog.example.com';
const notFound = () =>
  json({ errors: [{ message: 'Post not found', extensions: { code: 'NOT_FOUND' } }], data: null });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('configuration', () => {
  it('reads settings from the environment', async () => {
    vi.stubEnv('HASHNODE_PUBLICATION_HOST', 'env.example.com');
    vi.stubEnv('HASHNODE_API_URL', 'https://gql.example.com/');
    vi.stubEnv('HASHNODE_ACCESS_TOKEN', 'env-token');
    const { fetch, requests } = mockFetch(json({ data: { publication: null } }));
    const client = new HashnodeClient({ fetch });

    await client.getPublication();
    expect(client.host).toBe('env.example.com');
    expect(requests[0]!.url).toBe('https://gql.example.com/');
    expect(requests[0]!.body.variables.host).toBe('env.example.com');
    expect((requests[0]!.init.headers as Record<string, string>).authorization).toBe('env-token');
  });

  it('prefers explicit options over the environment', () => {
    vi.stubEnv('HASHNODE_PUBLICATION_HOST', 'env.example.com');
    expect(new HashnodeClient({ host: HOST }).host).toBe(HOST);
  });

  it('fails clearly when no host is configured', async () => {
    vi.stubEnv('HASHNODE_PUBLICATION_HOST', '');
    const { fetch } = mockFetch();
    await expect(new HashnodeClient({ fetch }).getPosts()).rejects.toMatchObject({
      code: 'CONFIG_ERROR',
    });
  });
});

describe('HashnodeClient', () => {
  it('lists posts as a page', async () => {
    const post = { id: '1', slug: 'hello' };
    const { fetch, requests } = mockFetch(
      json({ data: { publication: { posts: connection([post], true, 'c1') } } }),
    );
    const page = await new HashnodeClient({ host: HOST, fetch }).getPosts({
      first: 5,
      after: 'c0',
      tagSlugs: ['js'],
    });

    expect(page).toEqual({
      items: [post],
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
      totalDocuments: 1,
    });
    expect(requests[0]!.body.variables).toEqual({
      host: HOST,
      first: 5,
      after: 'c0',
      filter: { tagSlugs: ['js'] },
    });
  });

  it('applies the default page size and clamps to the maximum', async () => {
    const empty = () => json({ data: { publication: { posts: connection([]) } } });
    const { fetch, requests } = mockFetch(empty(), empty());
    const client = new HashnodeClient({ host: HOST, fetch });

    await client.getPosts();
    await client.getPosts({ first: 500 });
    expect(requests[0]!.body.variables.first).toBe(10);
    expect(requests[1]!.body.variables.first).toBe(MAX_PAGE_SIZE);
  });

  it('rejects invalid page sizes', async () => {
    const client = new HashnodeClient({ host: HOST, fetch: mockFetch().fetch });
    await expect(client.getPosts({ first: 0 })).rejects.toBeInstanceOf(RangeError);
    await expect(client.getPosts({ first: 1.5 })).rejects.toBeInstanceOf(RangeError);
  });

  it('returns an empty page when the publication is missing', async () => {
    const { fetch } = mockFetch(json({ data: { publication: null } }));
    const page = await new HashnodeClient({ host: HOST, fetch }).getPosts();
    expect(page).toEqual({
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalDocuments: 0,
    });
  });

  it('iterates over every page of posts', async () => {
    const { fetch, requests } = mockFetch(
      json({
        data: { publication: { posts: connection([{ id: '1' }, { id: '2' }], true, 'c2') } },
      }),
      json({ data: { publication: { posts: connection([{ id: '3' }]) } } }),
    );
    const ids: string[] = [];
    for await (const post of new HashnodeClient({ host: HOST, fetch }).iteratePosts()) {
      ids.push(post.id);
    }

    expect(ids).toEqual(['1', '2', '3']);
    expect(requests[0]!.body.variables).toMatchObject({ first: MAX_PAGE_SIZE, after: null });
    expect(requests[1]!.body.variables).toMatchObject({ after: 'c2' });
  });

  it('fetches a post by slug, trimming input', async () => {
    const post = { id: '1', slug: 'hello' };
    const { fetch, requests } = mockFetch(json({ data: { publication: { post } } }));
    await expect(new HashnodeClient({ host: HOST, fetch }).getPost(' hello ')).resolves.toEqual(
      post,
    );
    expect(requests[0]!.body.variables).toEqual({ host: HOST, slug: 'hello' });
  });

  it('rejects empty slugs without a request', async () => {
    const { fetch } = mockFetch();
    await expect(new HashnodeClient({ host: HOST, fetch }).getPost('  ')).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  it('returns null for NOT_FOUND lookups', async () => {
    const { fetch } = mockFetch(notFound(), notFound(), notFound());
    const client = new HashnodeClient({ host: HOST, fetch });
    await expect(client.getPostById('missing')).resolves.toBeNull();
    await expect(client.getStaticPage('missing')).resolves.toBeNull();
    await expect(client.getPostComments('missing')).resolves.toMatchObject({ items: [] });
  });

  it('still throws other errors from lookups', async () => {
    const { fetch } = mockFetch(
      json({ errors: [{ message: 'No Pro', extensions: { code: 'FORBIDDEN' } }], data: null }),
    );
    await expect(new HashnodeClient({ host: HOST, fetch }).getPost('x')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('resolves the publication ID once for search', async () => {
    const results = () => json({ data: { searchPostsOfPublication: connection([{ id: 'p' }]) } });
    const { fetch, requests } = mockFetch(
      json({ data: { publication: { id: 'pub-1' } } }),
      results(),
      results(),
    );
    const client = new HashnodeClient({ host: HOST, fetch });

    await client.searchPosts('graphql', { sortBy: 'DATE_PUBLISHED_DESC' });
    const page = await client.searchPosts('rest');

    expect(page.items).toEqual([{ id: 'p' }]);
    expect(requests).toHaveLength(3);
    expect(requests[1]!.body.variables).toEqual({
      first: 10,
      after: null,
      sortBy: 'DATE_PUBLISHED_DESC',
      filter: { publicationId: 'pub-1', query: 'graphql' },
    });
    expect(requests[2]!.body.variables).toMatchObject({
      filter: { publicationId: 'pub-1', query: 'rest' },
    });
  });

  it('uses a configured publication ID without a lookup', async () => {
    const { fetch, requests } = mockFetch(
      json({ data: { searchPostsOfPublication: connection([]) } }),
    );
    await new HashnodeClient({ host: HOST, publicationId: 'pub-9', fetch }).searchPosts('x');
    expect(requests).toHaveLength(1);
    expect(requests[0]!.body.variables).toMatchObject({ filter: { publicationId: 'pub-9' } });
  });

  it('retries the publication ID lookup after a failure', async () => {
    const { fetch } = mockFetch(
      new TypeError('offline'),
      json({ data: { publication: { id: 'pub-1' } } }),
    );
    const client = new HashnodeClient({ host: HOST, fetch });
    await expect(client.getPublicationId()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(client.getPublicationId()).resolves.toBe('pub-1');
  });

  it('reports an unknown publication when resolving its ID', async () => {
    const { fetch } = mockFetch(json({ data: { publication: null } }));
    await expect(
      new HashnodeClient({ host: HOST, fetch }).getPublicationId(),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lists series, series posts, static pages and comments', async () => {
    const { fetch, requests } = mockFetch(
      json({ data: { publication: { seriesList: connection([{ id: 's' }]) } } }),
      json({ data: { publication: { series: { id: 's' } } } }),
      json({ data: { publication: { series: { posts: connection([{ id: 'p' }]) } } } }),
      json({ data: { publication: { series: null } } }),
      json({ data: { publication: { staticPages: connection([{ id: 'sp' }]) } } }),
      json({ data: { post: { comments: connection([{ id: 'c' }]) } } }),
    );
    const client = new HashnodeClient({ host: HOST, fetch });

    expect((await client.getSeriesList()).items).toEqual([{ id: 's' }]);
    expect(await client.getSeries('s')).toEqual({ id: 's' });
    expect((await client.getSeriesPosts('s', { first: 3 })).items).toEqual([{ id: 'p' }]);
    expect((await client.getSeriesPosts('missing')).items).toEqual([]);
    expect((await client.getStaticPages()).items).toEqual([{ id: 'sp' }]);
    expect((await client.getPostComments('post-1')).items).toEqual([{ id: 'c' }]);
    expect(requests[2]!.body.variables).toEqual({ host: HOST, slug: 's', first: 3, after: null });
    expect(requests[5]!.body.variables).toEqual({ id: 'post-1', first: 10, after: null });
  });

  it('unwraps recommended publications', async () => {
    const { fetch } = mockFetch(
      json({ data: { publication: { recommendedPublications: [{ node: { id: 'r' } }] } } }),
    );
    await expect(
      new HashnodeClient({ host: HOST, fetch }).getRecommendedPublications(),
    ).resolves.toEqual([{ id: 'r' }]);
  });

  it('requires a token for drafts', async () => {
    vi.stubEnv('HASHNODE_ACCESS_TOKEN', '');
    const { fetch } = mockFetch();
    const error = await new HashnodeClient({ host: HOST, fetch })
      .getDrafts()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HashnodeError);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('clamps draft page size', async () => {
    const { fetch, requests } = mockFetch(
      json({ data: { publication: { drafts: connection([{ id: 'd' }]) } } }),
    );
    const page = await new HashnodeClient({ host: HOST, token: 't', fetch }).getDrafts({
      first: 80,
    });
    expect(page.items).toEqual([{ id: 'd' }]);
    expect(requests[0]!.body.variables.first).toBe(MAX_DRAFT_PAGE_SIZE);
  });
});
