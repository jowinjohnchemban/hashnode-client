/**
 * Contract test: runs every query against the live Hashnode API to catch schema
 * drift. Needs network access but no Pro plan or credentials.
 *
 * Hashnode validates a query before running it. A query with an unknown field
 * or wrong variable type fails with GRAPHQL_VALIDATION_FAILED or BAD_USER_INPUT,
 * while a valid query against a non-Pro publication reaches the resolvers and
 * fails with FORBIDDEN. So any outcome other than success or one of the codes
 * below means a query no longer matches the schema.
 */

import { describe, expect, it } from 'vitest';
import { HashnodeClient, HashnodeError } from '../../src';

const host = process.env.HASHNODE_CONTRACT_HOST ?? 'engineering.hashnode.com';
const endpoint = process.env.HASHNODE_API_URL;
const MISSING_ID = '000000000000000000000000';
const ACCEPTED_CODES = ['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'];

const client = new HashnodeClient({ host, endpoint, publicationId: MISSING_ID });
const authed = new HashnodeClient({ host, endpoint, token: 'contract-test-token' });

const operations: Record<string, () => Promise<unknown>> = {
  getPublication: () => client.getPublication(),
  getPosts: () => client.getPosts({ first: 1, tagSlugs: ['javascript'] }),
  getPost: () => client.getPost('contract-test'),
  getPostById: () => client.getPostById(MISSING_ID),
  searchPosts: () => client.searchPosts('graphql', { first: 1, sortBy: 'DATE_PUBLISHED_DESC' }),
  getSeriesList: () => client.getSeriesList({ first: 1 }),
  getSeries: () => client.getSeries('contract-test'),
  getSeriesPosts: () => client.getSeriesPosts('contract-test', { first: 1 }),
  getStaticPages: () => client.getStaticPages({ first: 1 }),
  getStaticPage: () => client.getStaticPage('contract-test'),
  getPostComments: () => client.getPostComments(MISSING_ID, { first: 1 }),
  getRecommendedPublications: () => client.getRecommendedPublications(),
  getDrafts: () => authed.getDrafts({ first: 1 }),
};

describe(`contract with ${endpoint ?? 'the default endpoint'} (host: ${host})`, () => {
  it.each(Object.entries(operations))('%s passes schema validation', async (_name, run) => {
    try {
      await run();
    } catch (error) {
      expect(error).toBeInstanceOf(HashnodeError);
      const { code, message } = error as HashnodeError;
      expect(ACCEPTED_CODES, `${code}: ${message}`).toContain(code);
    }
  });

  it('reports schema errors with a validation code', async () => {
    const error = await client
      .request('query ($host: String!) { publication(host: $host) { notAField } }', { host })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HashnodeError);
    expect((error as HashnodeError).code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect((error as HashnodeError).status).toBe(400);
  });
});
