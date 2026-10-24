import { vi } from 'vitest';

export interface RecordedRequest {
  url: string;
  init: RequestInit & { next?: unknown; cache?: string };
  headers: Headers;
  body: { query: string; variables: Record<string, unknown> };
}

/** A fetch mock that replies with queued responses and records each request. */
export function mockFetch(
  ...responses: (Response | Error | ((req: RecordedRequest) => Response))[]
) {
  const requests: RecordedRequest[] = [];
  const fetch = vi.fn((input: string | URL | Request, init: RequestInit = {}) => {
    const request: RecordedRequest = {
      url: input instanceof Request ? input.url : input.toString(),
      init,
      headers: new Headers(init.headers),
      body: JSON.parse(init.body as string) as RecordedRequest['body'],
    };
    requests.push(request);
    const next = responses.shift();
    if (!next) throw new Error('Unexpected fetch call');
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(typeof next === 'function' ? next(request) : next);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, requests };
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/**
 * A fetch that never settles until its signal aborts, then rejects with the
 * abort reason. Like real fetch, it rejects at once if the signal is already aborted.
 */
export const hangingFetch = ((_url: string, init: RequestInit) =>
  new Promise((_resolve, reject) => {
    const { signal } = init;
    if (signal?.aborted) {
      reject(signal.reason as Error);
      return;
    }
    signal?.addEventListener('abort', () => {
      reject(signal.reason as Error);
    });
  })) as unknown as typeof globalThis.fetch;

export function connection<T>(nodes: T[], hasNextPage = false, endCursor: string | null = null) {
  return {
    edges: nodes.map((node) => ({ node })),
    pageInfo: { hasNextPage, endCursor },
    totalDocuments: nodes.length,
  };
}
