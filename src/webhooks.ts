/**
 * Webhook verification and dispatch.
 *
 * Uses the Web Crypto API, so it runs in Node.js, edge runtimes and workers.
 *
 * Hashnode signs each delivery with your webhook secret and sends the result in
 * the `x-hashnode-signature` header as `t=<timestamp>,v1=<hex HMAC-SHA256>`, where
 * the signed message is `<timestamp>.<raw request body>`.
 *
 * @module webhooks
 */

/** Header that carries the webhook signature. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-hashnode-signature';

/** Default allowed clock skew between Hashnode and your server, in seconds. */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

/** Post event types. */
export const POST_EVENTS = ['post_published', 'post_updated', 'post_deleted'] as const;

/** Static page event types. */
export const STATIC_PAGE_EVENTS = [
  'static_page_published',
  'static_page_edited',
  'static_page_deleted',
] as const;

export type PostEventType = (typeof POST_EVENTS)[number];
export type StaticPageEventType = (typeof STATIC_PAGE_EVENTS)[number];
export type WebhookEventType = PostEventType | StaticPageEventType;

/** Body of a webhook delivery. Fetch full content with the client using the IDs. */
export interface WebhookPayload {
  metadata: { uuid: string };
  data: {
    /** Event type; unknown future events are passed through as strings. */
    eventType: WebhookEventType | (string & {});
    publication: { id: string };
    post?: { id: string };
    staticPage?: { id: string };
  };
}

export interface VerifyWebhookOptions {
  /** Raw request body, exactly as received. Do not re-serialize parsed JSON. */
  payload: string;
  /** Value of the `x-hashnode-signature` header. */
  signature: string | null | undefined;
  /** Webhook secret from the Hashnode dashboard. */
  secret: string;
  /**
   * Maximum age of the signature timestamp, in seconds. Pass `null` to skip the
   * timestamp check. Defaults to {@link DEFAULT_WEBHOOK_TOLERANCE_SECONDS}.
   */
  toleranceSeconds?: number | null;
  /** Current time in milliseconds. Defaults to `Date.now()`; useful in tests. */
  now?: number;
}

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Splits a `t=...,v1=...` signature header into its parts. */
export function parseSignatureHeader(
  header: string | null | undefined,
): { timestamp: string; signatures: string[] } | null {
  if (!header) return null;
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1' && value) signatures.push(value.toLowerCase());
  }
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function timestampToMs(timestamp: string): number {
  const value = Number(timestamp);
  // Accept both second and millisecond precision.
  return value < 1e12 ? value * 1000 : value;
}

/**
 * Verifies a webhook signature.
 *
 * @returns `true` if the signature matches and the timestamp is within tolerance.
 */
export async function verifyWebhookSignature(options: VerifyWebhookOptions): Promise<boolean> {
  const { payload, secret, now = Date.now() } = options;
  const tolerance =
    options.toleranceSeconds === undefined
      ? DEFAULT_WEBHOOK_TOLERANCE_SECONDS
      : options.toleranceSeconds;
  if (!secret || typeof payload !== 'string') return false;

  const parsed = parseSignatureHeader(options.signature);
  if (!parsed) return false;

  if (tolerance !== null && Math.abs(now - timestampToMs(parsed.timestamp)) > tolerance * 1000) {
    return false;
  }

  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${payload}`);
  return parsed.signatures.some((signature) => timingSafeEqual(signature, expected));
}

/**
 * Builds a signature header for a payload. Use it to test your webhook endpoint.
 *
 * @param timestamp - Unix time in seconds. Defaults to now.
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return `t=${timestamp},v1=${signature}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parses and validates a webhook body.
 *
 * @throws {TypeError} If the body is not valid JSON or lacks required fields.
 */
export function parseWebhookPayload(payload: unknown): WebhookPayload {
  let value: unknown = payload;
  if (typeof payload === 'string') {
    try {
      value = JSON.parse(payload);
    } catch {
      throw new TypeError('Webhook payload is not valid JSON');
    }
  }

  if (!isRecord(value) || !isRecord(value.data)) {
    throw new TypeError('Webhook payload is missing `data`');
  }
  const { data } = value;
  if (typeof data.eventType !== 'string' || !data.eventType) {
    throw new TypeError('Webhook payload is missing `data.eventType`');
  }
  if (!isRecord(data.publication) || typeof data.publication.id !== 'string') {
    throw new TypeError('Webhook payload is missing `data.publication.id`');
  }
  return value as unknown as WebhookPayload;
}

/** True for post events. */
export function isPostEvent(eventType: string): eventType is PostEventType {
  return (POST_EVENTS as readonly string[]).includes(eventType);
}

/** True for static page events. */
export function isStaticPageEvent(eventType: string): eventType is StaticPageEventType {
  return (STATIC_PAGE_EVENTS as readonly string[]).includes(eventType);
}

/** Handles one webhook event. */
export type WebhookHandler = (payload: WebhookPayload) => unknown;

/** Event handlers keyed by event type. `'*'` runs for every event. */
export type WebhookHandlers = Partial<Record<WebhookEventType | '*', WebhookHandler>>;

/**
 * Runs the handler registered for the payload's event, then the `'*'` handler.
 *
 * @returns `true` if at least one handler ran.
 */
export async function dispatchWebhook(
  payload: WebhookPayload,
  handlers: WebhookHandlers,
): Promise<boolean> {
  const specific = handlers[payload.data.eventType as WebhookEventType];
  const fallback = handlers['*'];
  if (specific) await specific(payload);
  if (fallback) await fallback(payload);
  return Boolean(specific ?? fallback);
}

export interface WebhookRequestHandlerOptions {
  /** Webhook secret. Defaults to `HASHNODE_WEBHOOK_SECRET`. */
  secret?: string;
  /** Event handlers. */
  handlers: WebhookHandlers;
  /** See {@link VerifyWebhookOptions.toleranceSeconds}. */
  toleranceSeconds?: number | null;
  /** Called when a handler throws. The request still gets a 500 response. */
  onError?: (error: unknown) => void;
}

/**
 * Creates a Fetch API request handler that verifies, parses and dispatches
 * webhooks. Works as a Next.js route handler, in Hono, Bun, Deno and workers.
 *
 * Responds `401` on a bad signature, `400` on a malformed body, `500` if a
 * handler throws, and `200` otherwise.
 *
 * @example
 * ```ts
 * // app/api/hashnode/route.ts
 * export const POST = createWebhookHandler({
 *   handlers: { post_published: ({ data }) => revalidateTag(`post:${data.post?.id}`) },
 * });
 * ```
 */
export function createWebhookHandler(
  options: WebhookRequestHandlerOptions,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const secret =
      options.secret ??
      (typeof process === 'undefined' ? undefined : process.env.HASHNODE_WEBHOOK_SECRET);
    if (!secret) {
      return Response.json({ error: 'Webhook secret is not configured' }, { status: 500 });
    }

    const body = await request.text();
    const valid = await verifyWebhookSignature({
      payload: body,
      signature: request.headers.get(WEBHOOK_SIGNATURE_HEADER),
      secret,
      toleranceSeconds: options.toleranceSeconds,
    });
    if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 });

    let payload: WebhookPayload;
    try {
      payload = parseWebhookPayload(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid payload';
      return Response.json({ error: message }, { status: 400 });
    }

    try {
      const handled = await dispatchWebhook(payload, options.handlers);
      return Response.json({ received: true, handled });
    } catch (error) {
      options.onError?.(error);
      return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
  };
}
