/**
 * Error type thrown by the client.
 *
 * @module errors
 */

/** A single error entry from a GraphQL response. */
export interface GraphQLErrorItem {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; [key: string]: unknown };
}

/**
 * Error codes produced by the client itself. Errors returned by the API keep
 * the server's code (for example `FORBIDDEN` when the publication is not on Pro).
 */
export type HashnodeClientErrorCode =
  | 'CONFIG_ERROR'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE'
  | 'GRAPHQL_ERROR'
  | 'UNAUTHENTICATED';

export interface HashnodeErrorOptions {
  code: HashnodeClientErrorCode | (string & {});
  status?: number;
  errors?: GraphQLErrorItem[];
  cause?: unknown;
}

/** Thrown for configuration, network, HTTP and GraphQL failures. */
export class HashnodeError extends Error {
  override readonly name = 'HashnodeError';
  /** Client error code, or the server's `extensions.code`. */
  readonly code: string;
  /** HTTP status code, when the failure came from an HTTP response. */
  readonly status: number | undefined;
  /** GraphQL errors returned by the API, if any. */
  readonly errors: GraphQLErrorItem[];

  constructor(message: string, options: HashnodeErrorOptions) {
    super(message, { cause: options.cause });
    this.code = options.code;
    this.status = options.status;
    this.errors = options.errors ?? [];
  }
}

/** Type guard for {@link HashnodeError}. */
export function isHashnodeError(error: unknown): error is HashnodeError {
  return error instanceof HashnodeError;
}
