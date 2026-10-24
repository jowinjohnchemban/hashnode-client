import { vi } from 'vitest';

export interface RecordedRequest {
  url: string;
  init: RequestInit & { next?: unknown; cache?: string };
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

export function connection<T>(nodes: T[], hasNextPage = false, endCursor: string | null = null) {
  return {
    edges: nodes.map((node) => ({ node })),
    pageInfo: { hasNextPage, endCursor },
    totalDocuments: nodes.length,
  };
}
