/**
 * HTTP transport: sends GraphQL requests with timeout, auth and error mapping.
 *
 * @module transport
 * @internal
 */

import type { FetchCacheOptions, ResolvedConfig } from './config';
import { HashnodeError, type GraphQLErrorItem } from './errors';

/** Per-request options. */
export interface RequestOptions extends FetchCacheOptions {
  /** Aborts the request when signalled. */
  signal?: AbortSignal;
}

interface GraphQLResponseBody<T> {
  data?: T | null;
  errors?: GraphQLErrorItem[];
}

interface RequestSignals {
  /** Signal passed to fetch: aborts on timeout or when the caller aborts. */
  signal: AbortSignal;
  timeout: AbortSignal;
  caller: AbortSignal | undefined;
  /** Removes listeners added to combine the signals. Call once the request settles. */
  cleanup: () => void;
}

function anySignal(signals: AbortSignal[]): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(signals), cleanup: () => undefined };
  }
  // Fallback for runtimes without AbortSignal.any. The listeners are removed on
  // cleanup so a long-lived caller signal doesn't accumulate them.
  const controller = new AbortController();
  const listeners: [AbortSignal, () => void][] = [];
  const cleanup = () => {
    for (const [signal, listener] of listeners) signal.removeEventListener('abort', listener);
    listeners.length = 0;
  };
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const listener = () => {
      controller.abort(signal.reason);
      cleanup();
    };
    signal.addEventListener('abort', listener, { once: true });
    listeners.push([signal, listener]);
  }
  if (controller.signal.aborted) cleanup();
  return { signal: controller.signal, cleanup };
}

function createSignals(timeoutMs: number, caller: AbortSignal | undefined): RequestSignals {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!caller) return { signal: timeout, timeout, caller, cleanup: () => undefined };
  return { ...anySignal([caller, timeout]), timeout, caller };
}

/** Maps a failure while fetching or reading the response to a HashnodeError. */
function toTransportError(
  error: unknown,
  signals: RequestSignals,
  timeoutMs: number,
): HashnodeError {
  // Check the signals rather than the error: fetch rejects with the abort
  // reason, which can be any value when the caller aborts with a custom reason.
  if (signals.caller?.aborted) {
    return new HashnodeError('Request was aborted', { code: 'ABORTED', cause: error });
  }
  if (signals.timeout.aborted) {
    return new HashnodeError(`Request timed out after ${timeoutMs}ms`, {
      code: 'TIMEOUT',
      cause: error,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new HashnodeError(`Network request failed: ${message}`, {
    code: 'NETWORK_ERROR',
    cause: error,
  });
}

function buildHeaders(config: ResolvedConfig): Headers {
  // Headers merges names case-insensitively, so user headers replace the
  // defaults instead of being sent twice.
  const headers = new Headers({ 'content-type': 'application/json', accept: 'application/json' });
  for (const [name, value] of Object.entries(config.headers)) headers.set(name, value);
  if (config.token) headers.set('authorization', config.token);
  return headers;
}

function httpError(response: Response, cause?: unknown): HashnodeError {
  return new HashnodeError(`HTTP ${response.status} ${response.statusText}`.trim(), {
    code: 'HTTP_ERROR',
    status: response.status,
    cause,
  });
}

/**
 * Executes a GraphQL operation and returns its `data`.
 *
 * @throws {HashnodeError} On network, HTTP or GraphQL errors.
 */
export async function executeGraphQL<T>(
  config: ResolvedConfig,
  query: string,
  variables: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const signals = createSignals(config.timeoutMs, options.signal);
  const cache = options.cache ?? config.cache;
  const next = options.next ?? config.next;
  const init: RequestInit & { next?: FetchCacheOptions['next'] } = {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({ query, variables }),
    signal: signals.signal,
    ...(cache && { cache }),
    ...(next && { next }),
  };

  let response: Response;
  let body: GraphQLResponseBody<T> | null;
  try {
    try {
      response = await config.fetch(config.endpoint, init);
    } catch (error) {
      throw toTransportError(error, signals, config.timeoutMs);
    }
    try {
      body = (await response.json()) as GraphQLResponseBody<T> | null;
    } catch (error) {
      if (signals.signal.aborted) throw toTransportError(error, signals, config.timeoutMs);
      if (!response.ok) throw httpError(response, error);
      throw new HashnodeError('Response was not valid JSON', {
        code: 'INVALID_RESPONSE',
        status: response.status,
        cause: error,
      });
    }
  } finally {
    signals.cleanup();
  }

  const errors = Array.isArray(body?.errors) ? body.errors : [];
  if (errors.length > 0) {
    throw new HashnodeError(errors.map((e) => e.message).join('; '), {
      code: errors[0]?.extensions?.code ?? 'GRAPHQL_ERROR',
      status: response.status,
      errors,
    });
  }

  if (!response.ok) throw httpError(response);

  if (body?.data == null) {
    throw new HashnodeError('Response contained no data', {
      code: 'INVALID_RESPONSE',
      status: response.status,
    });
  }

  return body.data;
}
