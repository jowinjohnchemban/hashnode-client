import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connection, json } from './helpers';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('HASHNODE_PUBLICATION_HOST', 'blog.example.com');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('convenience functions', () => {
  it('return data from the shared client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(json({ data: { publication: { posts: connection([{ id: '1' }]) } } })),
      ),
    );
    const { getBlogPosts } = await import('../../src');
    await expect(getBlogPosts(3)).resolves.toEqual([{ id: '1' }]);
  });

  it('log and fall back on errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          json({ errors: [{ message: 'No Pro', extensions: { code: 'FORBIDDEN' } }], data: null }),
        ),
      ),
    );
    const api = await import('../../src');

    await expect(api.getPublication()).resolves.toBeNull();
    await expect(api.getBlogPosts()).resolves.toEqual([]);
    await expect(api.getBlogPostBySlug('x')).resolves.toBeNull();
    await expect(api.getSeriesList()).resolves.toEqual([]);
    await expect(api.getStaticPages()).resolves.toEqual([]);
    await expect(api.getRecommendedPublications()).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      '[hashnode-client] getPublication failed',
      'FORBIDDEN: No Pro',
    );
  });

  it('return data from every function', async () => {
    vi.stubEnv('HASHNODE_ACCESS_TOKEN', 'token');
    const item = { id: '1' };
    const responses: Record<string, unknown> = {
      Publication: { publication: { id: 'pub', title: 'Blog' } },
      PostBySlug: { publication: { post: item } },
      SearchPosts: { searchPostsOfPublication: connection([item]) },
      SeriesList: { publication: { seriesList: connection([item]) } },
      Series: { publication: { series: item } },
      SeriesPosts: { publication: { series: { posts: connection([item]) } } },
      StaticPages: { publication: { staticPages: connection([item]) } },
      StaticPage: { publication: { staticPage: item } },
      PostComments: { post: { comments: connection([item]) } },
      RecommendedPublications: { publication: { recommendedPublications: [{ node: item }] } },
      Drafts: { publication: { drafts: connection([item]) } },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        const { query } = JSON.parse(init.body as string) as { query: string };
        const operation = /query (\w+)/.exec(query)?.[1] ?? '';
        return Promise.resolve(json({ data: responses[operation] }));
      }),
    );
    const api = await import('../../src');

    await expect(api.getPublication()).resolves.toEqual({ id: 'pub', title: 'Blog' });
    await expect(api.getBlogPostBySlug('x')).resolves.toEqual(item);
    await expect(api.searchPosts('graphql', 5)).resolves.toEqual([item]);
    await expect(api.getSeriesList(5)).resolves.toEqual([item]);
    await expect(api.getSeries('s')).resolves.toEqual(item);
    await expect(api.getSeriesPosts('s', 5)).resolves.toEqual([item]);
    await expect(api.getStaticPages(5)).resolves.toEqual([item]);
    await expect(api.getStaticPage('about')).resolves.toEqual(item);
    await expect(api.getPostComments('1', 5)).resolves.toEqual([item]);
    await expect(api.getRecommendedPublications()).resolves.toEqual([item]);
    await expect(api.getDrafts(5)).resolves.toEqual([item]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('fall back on errors from every function', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    const api = await import('../../src');

    await expect(api.searchPosts('graphql')).resolves.toEqual([]);
    await expect(api.getSeries('s')).resolves.toBeNull();
    await expect(api.getSeriesPosts('s')).resolves.toEqual([]);
    await expect(api.getStaticPage('about')).resolves.toBeNull();
    await expect(api.getPostComments('1')).resolves.toEqual([]);
    await expect(api.getDrafts()).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledTimes(6);
  });

  it('log non-HashnodeError failures as-is', async () => {
    const { getBlogPostBySlug } = await import('../../src');
    await expect(getBlogPostBySlug('')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      '[hashnode-client] getBlogPostBySlug failed',
      expect.any(TypeError),
    );
  });

  it('skip blank search queries', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { searchPosts } = await import('../../src');
    await expect(searchPosts('  ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
