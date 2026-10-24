import { describe, expect, it } from 'vitest';
import { HashnodeClient, HashnodeError } from '../../src';
import { DEFAULT_ENDPOINT } from '../../src/config';
import { json, mockFetch } from './helpers';

const QUERY = 'query { __typename }';

describe('transport', () => {
  it('posts the query to the default endpoint', async () => {
    const { fetch, requests } = mockFetch(json({ data: { ok: true } }));
    const client = new HashnodeClient({ host: 'x.dev', fetch });

    await expect(client.request(QUERY, { a: 1 })).resolves.toEqual({ ok: true });
    expect(requests[0]!.url).toBe(DEFAULT_ENDPOINT);
    expect(requests[0]!.init.method).toBe('POST');
    expect(requests[0]!.body).toEqual({ query: QUERY, variables: { a: 1 } });
  });

  it('sends the token and custom headers', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }));
    const client = new HashnodeClient({ token: 'secret', headers: { 'x-extra': '1' }, fetch });

    await client.request(QUERY);
    const { headers } = requests[0]!;
    expect(headers.get('authorization')).toBe('secret');
    expect(headers.get('x-extra')).toBe('1');
  });

  it('omits the authorization header without a token', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }));
    await new HashnodeClient({ token: '', fetch }).request(QUERY);
    expect(requests[0]!.headers.has('authorization')).toBe(false);
  });

  it('forwards Next.js cache options, preferring per-request values', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }), json({ data: {} }));
    const client = new HashnodeClient({ fetch, next: { revalidate: 60 }, cache: 'force-cache' });

    await client.request(QUERY);
    await client.request(QUERY, {}, { next: { tags: ['t'] }, cache: 'no-store' });

    expect(requests[0]!.init.next).toEqual({ revalidate: 60 });
    expect(requests[0]!.init.cache).toBe('force-cache');
    expect(requests[1]!.init.next).toEqual({ tags: ['t'] });
    expect(requests[1]!.init.cache).toBe('no-store');
  });

  it('sets no cache options by default', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }));
    await new HashnodeClient({ fetch }).request(QUERY);
    expect(requests[0]!.init).not.toHaveProperty('next');
    expect(requests[0]!.init).not.toHaveProperty('cache');
  });

  it('maps GraphQL errors to HashnodeError with the server code', async () => {
    const { fetch } = mockFetch(
      json({
        errors: [{ message: 'No Pro plan', extensions: { code: 'FORBIDDEN' } }],
        data: { publication: null },
      }),
    );
    const error = await new HashnodeClient({ fetch }).request(QUERY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HashnodeError);
    expect(error).toMatchObject({ code: 'FORBIDDEN', message: 'No Pro plan', status: 200 });
    expect((error as HashnodeError).errors).toHaveLength(1);
  });

  it('maps non-JSON HTTP failures to HTTP_ERROR', async () => {
    const { fetch } = mockFetch(new Response('Bad gateway', { status: 502 }));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 502,
    });
  });

  it('maps a JSON HTTP failure without errors to HTTP_ERROR', async () => {
    const { fetch } = mockFetch(json({}, 500));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 500,
    });
  });

  it('rejects responses without data', async () => {
    const { fetch } = mockFetch(json({ data: null }));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('rejects invalid JSON on a 200 response', async () => {
    const { fetch } = mockFetch(new Response('<html>', { status: 200 }));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('maps network failures to NETWORK_ERROR', async () => {
    const { fetch } = mockFetch(new TypeError('fetch failed'));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Network request failed: fetch failed',
    });
  });

  it('times out slow requests', async () => {
    const fetch = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason as Error);
        });
      })) as unknown as typeof globalThis.fetch;

    await expect(new HashnodeClient({ fetch, timeoutMs: 20 }).request(QUERY)).rejects.toMatchObject(
      {
        code: 'TIMEOUT',
      },
    );
  });

  it('honours a caller abort signal', async () => {
    const fetch = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason as Error);
        });
      })) as unknown as typeof globalThis.fetch;
    const controller = new AbortController();
    const pending = new HashnodeClient({ fetch }).request(QUERY, {}, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
  });
});
