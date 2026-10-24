import { afterEach, describe, expect, it, vi } from 'vitest';
import { HashnodeClient, HashnodeError, isHashnodeError } from '../../src';
import { normalizeHost } from '../../src/config';
import { createWebhookHandler, generateWebhookSignature } from '../../src/webhooks';
import { connection, hangingFetch, json, mockFetch } from './helpers';

const QUERY = 'query { __typename }';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('configuration validation', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects timeoutMs %s', (timeoutMs) => {
    expect(() => new HashnodeClient({ timeoutMs, fetch: mockFetch().fetch })).toThrow(RangeError);
  });

  it('ignores an invalid HASHNODE_TIMEOUT_MS', async () => {
    vi.stubEnv('HASHNODE_TIMEOUT_MS', 'soon');
    const { fetch } = mockFetch(json({ data: {} }));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).resolves.toEqual({});
  });

  it('throws when no fetch is available', () => {
    vi.stubGlobal('fetch', undefined);
    expect(() => new HashnodeClient()).toThrow(/No fetch implementation/);
  });

  it.each([
    ['https://Blog.Example.com/', 'blog.example.com'],
    ['http://blog.example.com/posts/1', 'blog.example.com'],
    ['  blog.example.com  ', 'blog.example.com'],
    ['blog.example.com/', 'blog.example.com'],
    ['HTTPS://blog.example.com', 'blog.example.com'],
    ['https://Blog.Example.com?ref=home', 'blog.example.com'],
    ['blog.example.com:3000/posts#top', 'blog.example.com'],
    ['bücher.example', 'xn--bcher-kva.example'],
    ['   ', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('normalizes host %j to %j', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });

  it.each(['https://', '/', 'blog example.com'])('rejects invalid host %j', (host) => {
    expect(() => normalizeHost(host)).toThrow(TypeError);
    expect(() => new HashnodeClient({ host, fetch: mockFetch().fetch })).toThrow(
      /Invalid publication host/,
    );
  });

  it('normalizes hostile input in linear time', () => {
    const started = performance.now();
    expect(normalizeHost(`a${'/'.repeat(100_000)}`)).toBe('a');
    expect(() => normalizeHost('/'.repeat(100_000))).toThrow(TypeError);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it('sends the normalized host', async () => {
    const { fetch, requests } = mockFetch(json({ data: { publication: null } }));
    const client = new HashnodeClient({ host: 'https://Blog.Example.com/', fetch });

    await client.getPublication();
    expect(client.host).toBe('blog.example.com');
    expect(requests[0]!.body.variables.host).toBe('blog.example.com');
  });
});

describe('headers', () => {
  it('lets the token replace an Authorization header of any case', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }));
    await new HashnodeClient({ token: 't', headers: { Authorization: 'Bearer u' }, fetch }).request(
      QUERY,
    );
    expect(requests[0]!.headers.get('authorization')).toBe('t');
  });

  it('lets custom headers replace the defaults', async () => {
    const { fetch, requests } = mockFetch(json({ data: {} }));
    await new HashnodeClient({
      headers: { Accept: 'application/graphql-response+json' },
      fetch,
    }).request(QUERY);
    expect(requests[0]!.headers.get('accept')).toBe('application/graphql-response+json');
  });
});

describe('aborts and timeouts', () => {
  it('reports ABORTED for a custom abort reason', async () => {
    const controller = new AbortController();
    const pending = new HashnodeClient({ fetch: hangingFetch }).request(
      QUERY,
      {},
      { signal: controller.signal },
    );
    controller.abort(new Error('user cancelled'));
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('reports ABORTED when the signal is already aborted', async () => {
    const pending = new HashnodeClient({ fetch: hangingFetch }).request(
      QUERY,
      {},
      { signal: AbortSignal.abort() },
    );
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('reports TIMEOUT when reading the body times out', async () => {
    const fetch = ((_url: string, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(init.signal?.reason as Error);
            });
          }),
      })) as unknown as typeof globalThis.fetch;

    await expect(new HashnodeClient({ fetch, timeoutMs: 20 }).request(QUERY)).rejects.toMatchObject(
      { code: 'TIMEOUT' },
    );
  });

  it('works without AbortSignal.any', async () => {
    vi.stubGlobal(
      'AbortSignal',
      Object.assign(Object.create(AbortSignal) as typeof AbortSignal, {
        any: undefined,
        timeout: AbortSignal.timeout.bind(AbortSignal),
      }),
    );
    const controller = new AbortController();
    const pending = new HashnodeClient({ fetch: hangingFetch }).request(
      QUERY,
      {},
      { signal: controller.signal },
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });

    await expect(
      new HashnodeClient({ fetch: hangingFetch }).request(
        QUERY,
        {},
        { signal: AbortSignal.abort() },
      ),
    ).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('removes fallback listeners from a reused signal once requests settle', async () => {
    vi.stubGlobal(
      'AbortSignal',
      Object.assign(Object.create(AbortSignal) as typeof AbortSignal, {
        any: undefined,
        timeout: AbortSignal.timeout.bind(AbortSignal),
      }),
    );
    const { signal } = new AbortController();
    const added = vi.spyOn(signal, 'addEventListener');
    const removed = vi.spyOn(signal, 'removeEventListener');
    const { fetch } = mockFetch(
      json({ data: {} }),
      json({ errors: [{ message: 'x' }] }),
      new TypeError('offline'),
    );
    const client = new HashnodeClient({ fetch });

    await client.request(QUERY, {}, { signal });
    await client.request(QUERY, {}, { signal }).catch(() => undefined);
    await client.request(QUERY, {}, { signal }).catch(() => undefined);

    expect(added).toHaveBeenCalledTimes(3);
    expect(removed).toHaveBeenCalledTimes(3);
  });

  it('times out with a caller signal that never aborts', async () => {
    const pending = new HashnodeClient({ fetch: hangingFetch, timeoutMs: 20 }).request(
      QUERY,
      {},
      { signal: new AbortController().signal },
    );
    await expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});

describe('response handling', () => {
  it('ignores a non-array errors field', async () => {
    const { fetch } = mockFetch(json({ data: { ok: 1 }, errors: 'nope' }));
    await expect(new HashnodeClient({ fetch }).request(QUERY)).resolves.toEqual({ ok: 1 });
  });

  it('reports non-Error network failures', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- fetch can reject with any value
    const fetch = (() => Promise.reject('offline')) as unknown as typeof globalThis.fetch;
    await expect(new HashnodeClient({ fetch }).request(QUERY)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Network request failed: offline',
    });
  });
});

describe('isHashnodeError', () => {
  it('recognises errors from another copy of the package', () => {
    const foreign = Object.assign(new Error('x'), {
      name: 'HashnodeError',
      code: 'FORBIDDEN',
      errors: [],
    });
    expect(isHashnodeError(foreign)).toBe(true);
    expect(isHashnodeError(new HashnodeError('x', { code: 'X' }))).toBe(true);
  });

  it.each([new Error('x'), { name: 'HashnodeError', code: 'X', errors: [] }, null, 'error'])(
    'rejects %j',
    (value) => {
      expect(isHashnodeError(value)).toBe(false);
    },
  );
});

describe('iteratePosts', () => {
  it('stops when the cursor repeats', async () => {
    const page = () =>
      json({ data: { publication: { posts: connection([{ id: '1' }], true, 'same') } } });
    const { fetch } = mockFetch(page(), page());
    const ids: string[] = [];
    const iterate = async () => {
      for await (const post of new HashnodeClient({ host: 'x.dev', fetch }).iteratePosts()) {
        ids.push(post.id);
      }
    };
    await expect(iterate()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(ids).toEqual(['1']);
  });

  it('stops when hasNextPage is true but there is no cursor', async () => {
    const { fetch, requests } = mockFetch(
      json({ data: { publication: { posts: connection([{ id: '1' }], true, null) } } }),
    );
    const ids: string[] = [];
    for await (const post of new HashnodeClient({ host: 'x.dev', fetch }).iteratePosts()) {
      ids.push(post.id);
    }
    expect(ids).toEqual(['1']);
    expect(requests).toHaveLength(1);
  });
});

describe('webhook handler', () => {
  const respond = createWebhookHandler({ secret: 's', handlers: {} });

  it('rejects methods other than POST', async () => {
    const response = await respond(new Request('https://example.com/hook'));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('returns 400 when the body cannot be read', async () => {
    const request = new Request('https://example.com/hook', { method: 'POST', body: 'x' });
    await request.text(); // consume the body
    const response = await respond(request);
    expect(response.status).toBe(400);
  });

  it('reports handled: false when no handler matches', async () => {
    const body = JSON.stringify({
      metadata: { uuid: 'u' },
      data: { eventType: 'post_published', publication: { id: 'p' } },
    });
    const response = await respond(
      new Request('https://example.com/hook', {
        method: 'POST',
        body,
        headers: { 'x-hashnode-signature': await generateWebhookSignature(body, 's') },
      }),
    );
    await expect(response.json()).resolves.toEqual({ received: true, handled: false });
  });
});
