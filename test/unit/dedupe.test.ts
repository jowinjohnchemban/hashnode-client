import { describe, expect, it, vi } from 'vitest';
import { HashnodeClient } from '../../src';
import { InFlightRequests, isQueryOperation } from '../../src/dedupe';
import { json } from './helpers';

const HOST = 'blog.example.com';

interface PendingCall {
  body: { query: string; variables: Record<string, unknown> };
  signal: AbortSignal | undefined;
  respond: (response: Response) => void;
  fail: (error: unknown) => void;
}

/** A fetch whose responses are released manually, to hold requests in flight. */
function controlledFetch() {
  const calls: PendingCall[] = [];
  const fetch = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init.signal ?? undefined;
        signal?.addEventListener('abort', () => {
          reject(signal.reason as Error);
        });
        calls.push({
          body: JSON.parse(init.body as string) as PendingCall['body'],
          signal,
          respond: resolve,
          fail: reject,
        });
      }),
  );
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const post = (slug: string) => ({ data: { publication: { post: { id: slug, slug } } } });

describe('request de-duplication', () => {
  it('sends one API request for 100 identical concurrent calls', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    const pending = Array.from({ length: 100 }, () => client.getPost('hello'));
    expect(calls).toHaveLength(1);

    calls[0]!.respond(json(post('hello')));
    const results = await Promise.all(pending);

    expect(calls).toHaveLength(1);
    expect(results).toHaveLength(100);
    for (const result of results) expect(result).toEqual({ id: 'hello', slug: 'hello' });
  });

  it('gives every caller its own copy of the result', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    const [first, second] = [client.getPost('hello'), client.getPost('hello')];
    calls[0]!.respond(json(post('hello')));
    const a = await first;
    const b = await second;

    expect(a).not.toBe(b);
    a!.slug = 'changed';
    expect(b!.slug).toBe('hello');
  });

  it('sends separate requests for different variables or cache options', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    const pending = [
      client.getPost('a'),
      client.getPost('b'),
      client.getPost('a', { next: { revalidate: 60 } }),
      client.getPost('a', { cache: 'no-store' }),
      client.getPost('a'),
    ];
    expect(calls).toHaveLength(4);
    for (const call of calls) call.respond(json(post(String(call.body.variables.slug))));
    await Promise.all(pending);
  });

  it('starts a new request once the previous one has finished', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    const first = client.getPost('hello');
    calls[0]!.respond(json(post('hello')));
    await first;

    const second = client.getPost('hello');
    expect(calls).toHaveLength(2);
    calls[1]!.respond(json(post('hello')));
    await second;
  });

  it('shares failures, then retries on the next call', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    const pending = [client.getPost('hello'), client.getPost('hello')];
    calls[0]!.fail(new TypeError('offline'));
    const results = await Promise.allSettled(pending);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(calls).toHaveLength(1);

    const retry = client.getPost('hello');
    expect(calls).toHaveLength(2);
    calls[1]!.respond(json(post('hello')));
    await expect(retry).resolves.toMatchObject({ slug: 'hello' });
  });

  it('never shares mutations', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });
    const mutation =
      'mutation Publish($id: ID!) { publishDraft(input: { id: $id }) { post { id } } }';

    const pending = [
      client.request(mutation, { id: 'd1' }),
      client.request(mutation, { id: 'd1' }),
    ];
    expect(calls).toHaveLength(2);
    for (const call of calls) call.respond(json({ data: { ok: true } }));
    await Promise.all(pending);
  });

  it('can be turned off', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch, dedupe: false });

    const pending = [client.getPost('hello'), client.getPost('hello')];
    expect(calls).toHaveLength(2);
    for (const call of calls) call.respond(json(post('hello')));
    await Promise.all(pending);
  });
});

describe('aborting de-duplicated requests', () => {
  it('rejects only the caller that aborts while others keep waiting', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });
    const controller = new AbortController();

    const aborted = client.getPost('hello', { signal: controller.signal });
    const kept = client.getPost('hello');
    controller.abort();

    await expect(aborted).rejects.toMatchObject({ code: 'ABORTED' });
    expect(calls[0]!.signal?.aborted).toBe(false);

    calls[0]!.respond(json(post('hello')));
    await expect(kept).resolves.toMatchObject({ slug: 'hello' });
    expect(calls).toHaveLength(1);
  });

  it('cancels the API request once every caller has aborted', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });
    const a = new AbortController();
    const b = new AbortController();

    const first = client.getPost('hello', { signal: a.signal });
    const second = client.getPost('hello', { signal: b.signal });
    a.abort();
    expect(calls[0]!.signal?.aborted).toBe(false);
    b.abort();

    await expect(first).rejects.toMatchObject({ code: 'ABORTED' });
    await expect(second).rejects.toMatchObject({ code: 'ABORTED' });
    expect(calls[0]!.signal?.aborted).toBe(true);

    // A new call doesn't join the cancelled request.
    const fresh = client.getPost('hello');
    expect(calls).toHaveLength(2);
    calls[1]!.respond(json(post('hello')));
    await expect(fresh).resolves.toMatchObject({ slug: 'hello' });
  });

  it('rejects an already-aborted caller and cancels the request if nobody else waits', async () => {
    const { fetch, calls } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch });

    await expect(client.getPost('hello', { signal: AbortSignal.abort() })).rejects.toMatchObject({
      code: 'ABORTED',
    });
    expect(calls[0]!.signal?.aborted).toBe(true);
  });

  it('still times out the shared request', async () => {
    const { fetch } = controlledFetch();
    const client = new HashnodeClient({ host: HOST, fetch, timeoutMs: 20 });
    const results = await Promise.allSettled([client.getPost('hello'), client.getPost('hello')]);
    expect(results).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'TIMEOUT' }) }),
      expect.objectContaining({ reason: expect.objectContaining({ code: 'TIMEOUT' }) }),
    ]);
  });
});

describe('InFlightRequests', () => {
  it('tracks the number of requests in flight', async () => {
    const inFlight = new InFlightRequests();
    let release: (value: number) => void = () => undefined;
    const start = vi.fn(() => new Promise<number>((resolve) => (release = resolve)));

    const pending = [inFlight.run('k', start), inFlight.run('k', start), inFlight.run('j', start)];
    expect(inFlight.size).toBe(2);
    expect(start).toHaveBeenCalledTimes(2);
    release(1);
    await pending[2];
    expect(inFlight.size).toBe(1);
  });
});

describe('isQueryOperation', () => {
  it.each([
    ['{ publication { id } }', true],
    ['query Posts($host: String!) { a }', true],
    ['  # a comment\n  query { a }', true],
    ['query{ a }', true],
    ['mutation Publish { a }', false],
    ['subscription S { a }', false],
    ['queryAlias { a }', false],
    ['# only a comment', false],
    ['', false],
  ])('%j -> %s', (document, expected) => {
    expect(isQueryOperation(document)).toBe(expected);
  });
});
