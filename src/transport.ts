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

function buildSignal(timeoutMs: number, signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function toTransportError(error: unknown, timeoutMs: number): HashnodeError {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new HashnodeError(`Request timed out after ${timeoutMs}ms`, {
      code: 'TIMEOUT',
      cause: error,
    });
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new HashnodeError('Request was aborted', { code: 'ABORTED', cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new HashnodeError(`Network request failed: ${message}`, {
    code: 'NETWORK_ERROR',
    cause: error,
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
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...config.headers,
  };
  if (config.token) headers.authorization = config.token;

  const cache = options.cache ?? config.cache;
  const next = options.next ?? config.next;
  const init: RequestInit & { next?: FetchCacheOptions['next'] } = {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: buildSignal(config.timeoutMs, options.signal),
    ...(cache && { cache }),
    ...(next && { next }),
  };

  let response: Response;
  try {
    response = await config.fetch(config.endpoint, init);
  } catch (error) {
    throw toTransportError(error, config.timeoutMs);
  }

  let body: GraphQLResponseBody<T> | null;
  try {
    body = (await response.json()) as GraphQLResponseBody<T> | null;
  } catch (error) {
    if (!response.ok) {
      throw new HashnodeError(`HTTP ${response.status} ${response.statusText}`.trim(), {
        code: 'HTTP_ERROR',
        status: response.status,
        cause: error,
      });
    }
    throw new HashnodeError('Response was not valid JSON', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      cause: error,
    });
  }

  const errors = body?.errors ?? [];
  if (errors.length > 0) {
    throw new HashnodeError(errors.map((e) => e.message).join('; '), {
      code: errors[0]?.extensions?.code ?? 'GRAPHQL_ERROR',
      status: response.status,
      errors,
    });
  }

  if (!response.ok) {
    throw new HashnodeError(`HTTP ${response.status} ${response.statusText}`.trim(), {
      code: 'HTTP_ERROR',
      status: response.status,
    });
  }

  if (body?.data == null) {
    throw new HashnodeError('Response contained no data', {
      code: 'INVALID_RESPONSE',
      status: response.status,
    });
  }

  return body.data;
}
