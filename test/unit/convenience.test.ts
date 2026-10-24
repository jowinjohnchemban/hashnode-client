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

  it('skip blank search queries', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { searchPosts } = await import('../../src');
    await expect(searchPosts('  ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
