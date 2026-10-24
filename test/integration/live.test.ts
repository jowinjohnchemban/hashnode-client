/**
 * Live test: reads real data from a Pro publication.
 *
 * Skipped unless HASHNODE_PUBLICATION_HOST is set. Drafts are tested only when
 * HASHNODE_ACCESS_TOKEN is also set. Assertions check shapes, not content, so
 * any publication with at least one post works.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { getBlogPosts, HashnodeClient, type BlogPost } from '../../src';

const host = process.env.HASHNODE_PUBLICATION_HOST;
const token = process.env.HASHNODE_ACCESS_TOKEN;

const author = expect.objectContaining({
  id: expect.any(String),
  name: expect.any(String),
  username: expect.any(String),
});

const postSummary = expect.objectContaining({
  id: expect.any(String),
  slug: expect.any(String),
  url: expect.stringMatching(/^https?:\/\//),
  title: expect.any(String),
  excerpt: expect.any(String),
  publishedAt: expect.any(String),
  readTimeInMinutes: expect.any(Number),
  author,
});

const content = expect.objectContaining({
  html: expect.any(String),
  markdown: expect.any(String),
  text: expect.any(String),
});

describe.skipIf(!host)(`live API (host: ${host})`, () => {
  const client = new HashnodeClient({ host });
  let posts: BlogPost[] = [];

  beforeAll(async () => {
    posts = (await client.getPosts({ first: 5 })).items;
  });

  it('fetches the publication', async () => {
    const publication = await client.getPublication();
    expect(publication).toEqual(
      expect.objectContaining({ id: expect.any(String), title: expect.any(String), author }),
    );
    await expect(client.getPublicationId()).resolves.toBe(publication?.id);
  });

  it('lists posts', () => {
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) expect(post).toEqual(postSummary);
  });

  it('paginates without repeating posts', async () => {
    const first = await client.getPosts({ first: 1 });
    if (!first.pageInfo.hasNextPage) return;

    expect(first.pageInfo.endCursor).toEqual(expect.any(String));
    const second = await client.getPosts({ first: 1, after: first.pageInfo.endCursor });
    expect(second.items[0]?.id).toBeDefined();
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it('iterates across pages', async () => {
    const ids: string[] = [];
    for await (const post of client.iteratePosts({ first: 2 })) {
      ids.push(post.id);
      if (ids.length === 3) break;
    }
    expect(ids.length).toBe(Math.min(3, Math.max(posts.length, ids.length)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fetches a post by slug and by ID', async () => {
    const [summary] = posts;
    if (!summary) return;

    const bySlug = await client.getPost(summary.slug);
    expect(bySlug).toEqual(
      expect.objectContaining({ id: summary.id, slug: summary.slug, content }),
    );

    const byId = await client.getPostById(summary.id);
    expect(byId?.slug).toBe(summary.slug);
  });

  it('returns null for missing items', async () => {
    const missing = `does-not-exist-${Date.now()}`;
    await expect(client.getPost(missing)).resolves.toBeNull();
    await expect(client.getSeries(missing)).resolves.toBeNull();
    await expect(client.getStaticPage(missing)).resolves.toBeNull();
  });

  it('searches posts', async () => {
    const word = posts[0]?.title.split(/\s+/).find((w) => w.length > 3) ?? 'the';
    const page = await client.searchPosts(word, { first: 5 });
    expect(Array.isArray(page.items)).toBe(true);
    for (const post of page.items) expect(post).toEqual(postSummary);
  });

  it('lists series and their posts', async () => {
    const { items: series } = await client.getSeriesList({ first: 5 });
    const [first] = series;
    if (!first) return;

    expect(first).toEqual(expect.objectContaining({ id: first.id, name: expect.any(String) }));
    await expect(client.getSeries(first.slug)).resolves.toEqual(
      expect.objectContaining({ id: first.id }),
    );
    const seriesPosts = await client.getSeriesPosts(first.slug, { first: 2 });
    for (const post of seriesPosts.items) expect(post).toEqual(postSummary);
  });

  it('lists static pages', async () => {
    const { items: pages } = await client.getStaticPages({ first: 5 });
    const [first] = pages;
    if (!first) return;

    expect(first).toEqual(expect.objectContaining({ slug: expect.any(String), content }));
    await expect(client.getStaticPage(first.slug)).resolves.toEqual(
      expect.objectContaining({ id: first.id }),
    );
  });

  it('lists comments and recommendations', async () => {
    const [post] = posts;
    if (post) {
      const comments = await client.getPostComments(post.id, { first: 5 });
      for (const comment of comments.items) {
        expect(comment).toEqual(
          expect.objectContaining({ id: expect.any(String), content, author }),
        );
      }
    }
    const recommended = await client.getRecommendedPublications();
    expect(Array.isArray(recommended)).toBe(true);
  });

  it('serves the convenience functions', async () => {
    const result = await getBlogPosts(2);
    expect(result.length).toBeGreaterThan(0);
  });

  it.skipIf(!token)('lists drafts with a token', async () => {
    const page = await new HashnodeClient({ host, token }).getDrafts({ first: 5 });
    expect(Array.isArray(page.items)).toBe(true);
  });
});
