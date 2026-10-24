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

/**
 * Type guard for {@link HashnodeError}.
 *
 * Unlike `instanceof`, this also recognises errors from another copy of the
 * package, for example when an app loads both the ESM and CommonJS builds.
 */
export function isHashnodeError(error: unknown): error is HashnodeError {
  if (error instanceof HashnodeError) return true;
  return (
    error instanceof Error &&
    error.name === 'HashnodeError' &&
    typeof (error as Partial<HashnodeError>).code === 'string' &&
    Array.isArray((error as Partial<HashnodeError>).errors)
  );
}
