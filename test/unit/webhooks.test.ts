import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createWebhookHandler,
  dispatchWebhook,
  generateWebhookSignature,
  isPostEvent,
  isStaticPageEvent,
  parseSignatureHeader,
  parseWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  type WebhookPayload,
} from '../../src/webhooks';

const SECRET = 'whsec_test';
const NOW_S = 1_760_000_000;
const NOW_MS = NOW_S * 1000;
const PAYLOAD: WebhookPayload = {
  metadata: { uuid: 'u-1' },
  data: { eventType: 'post_published', publication: { id: 'pub' }, post: { id: 'post' } },
};
const BODY = JSON.stringify(PAYLOAD);

function sign(body: string, timestamp: number | string, secret = SECRET): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature', async () => {
    await expect(
      verifyWebhookSignature({
        payload: BODY,
        signature: sign(BODY, NOW_S),
        secret: SECRET,
        now: NOW_MS,
      }),
    ).resolves.toBe(true);
  });

  it('matches node:crypto output via generateWebhookSignature', async () => {
    await expect(generateWebhookSignature(BODY, SECRET, NOW_S)).resolves.toBe(sign(BODY, NOW_S));
  });

  it('accepts millisecond timestamps', async () => {
    await expect(
      verifyWebhookSignature({
        payload: BODY,
        signature: sign(BODY, NOW_MS),
        secret: SECRET,
        now: NOW_MS,
      }),
    ).resolves.toBe(true);
  });

  it.each([
    ['wrong secret', sign(BODY, NOW_S, 'other')],
    ['tampered body', sign(`${BODY} `, NOW_S)],
    ['missing header', null],
    ['malformed header', 'garbage'],
    ['missing v1', `t=${NOW_S}`],
    ['non-numeric timestamp', sign(BODY, 'abc')],
  ])('rejects %s', async (_case, signature) => {
    await expect(
      verifyWebhookSignature({ payload: BODY, signature, secret: SECRET, now: NOW_MS }),
    ).resolves.toBe(false);
  });

  it('rejects an empty secret', async () => {
    await expect(
      verifyWebhookSignature({
        payload: BODY,
        signature: sign(BODY, NOW_S, ''),
        secret: '',
        now: NOW_MS,
      }),
    ).resolves.toBe(false);
  });

  it('enforces the timestamp tolerance', async () => {
    const old = sign(BODY, NOW_S - 301);
    await expect(
      verifyWebhookSignature({ payload: BODY, signature: old, secret: SECRET, now: NOW_MS }),
    ).resolves.toBe(false);
    await expect(
      verifyWebhookSignature({
        payload: BODY,
        signature: old,
        secret: SECRET,
        now: NOW_MS,
        toleranceSeconds: 600,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyWebhookSignature({
        payload: BODY,
        signature: old,
        secret: SECRET,
        now: NOW_MS,
        toleranceSeconds: null,
      }),
    ).resolves.toBe(true);
  });

  it('accepts any matching v1 signature (secret rotation)', async () => {
    const valid = sign(BODY, NOW_S).split('v1=')[1]!;
    const header = `t=${NOW_S},v1=${'0'.repeat(64)},v1=${valid}`;
    await expect(
      verifyWebhookSignature({ payload: BODY, signature: header, secret: SECRET, now: NOW_MS }),
    ).resolves.toBe(true);
  });
});

describe('parseSignatureHeader', () => {
  it('parses timestamp and signatures, ignoring unknown parts', () => {
    expect(parseSignatureHeader(' t=1, v0=x, v1=ABC ')).toEqual({
      timestamp: '1',
      signatures: ['abc'],
    });
  });
});

describe('parseWebhookPayload', () => {
  it('parses strings and objects', () => {
    expect(parseWebhookPayload(BODY)).toEqual(PAYLOAD);
    expect(parseWebhookPayload(PAYLOAD)).toBe(PAYLOAD);
  });

  it.each([
    ['invalid JSON', '{', /not valid JSON/],
    ['missing data', '{}', /missing `data`/],
    ['missing eventType', { data: { publication: { id: 'p' } } }, /eventType/],
    ['missing publication', { data: { eventType: 'post_published' } }, /publication/],
  ])('rejects %s', (_case, input, message) => {
    expect(() => parseWebhookPayload(input)).toThrow(message);
  });
});

describe('event helpers', () => {
  it('classifies events', () => {
    expect(isPostEvent('post_updated')).toBe(true);
    expect(isPostEvent('static_page_edited')).toBe(false);
    expect(isStaticPageEvent('static_page_deleted')).toBe(true);
    expect(isStaticPageEvent('post_deleted')).toBe(false);
  });

  it('dispatches to the specific and wildcard handlers', async () => {
    const specific = vi.fn();
    const wildcard = vi.fn();
    await expect(
      dispatchWebhook(PAYLOAD, { post_published: specific, '*': wildcard }),
    ).resolves.toBe(true);
    expect(specific).toHaveBeenCalledWith(PAYLOAD);
    expect(wildcard).toHaveBeenCalledWith(PAYLOAD);
    await expect(dispatchWebhook(PAYLOAD, {})).resolves.toBe(false);
  });
});

describe('createWebhookHandler', () => {
  function post(body: string, signature: string | null): Request {
    const headers = new Headers();
    if (signature) headers.set(WEBHOOK_SIGNATURE_HEADER, signature);
    return new Request('https://example.com/hook', { method: 'POST', body, headers });
  }

  it('dispatches a valid delivery', async () => {
    const handler = vi.fn();
    const respond = createWebhookHandler({ secret: SECRET, handlers: { post_published: handler } });
    const response = await respond(post(BODY, await generateWebhookSignature(BODY, SECRET)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, handled: true });
    expect(handler).toHaveBeenCalledWith(PAYLOAD);
  });

  it('rejects bad signatures with 401', async () => {
    const respond = createWebhookHandler({ secret: SECRET, handlers: {} });
    expect((await respond(post(BODY, 't=1,v1=00'))).status).toBe(401);
  });

  it('rejects malformed bodies with 400', async () => {
    const body = '{"data":{}}';
    const respond = createWebhookHandler({ secret: SECRET, handlers: {} });
    const response = await respond(post(body, await generateWebhookSignature(body, SECRET)));
    expect(response.status).toBe(400);
  });

  it('returns 500 and reports handler errors', async () => {
    const onError = vi.fn();
    const failure = new Error('boom');
    const respond = createWebhookHandler({
      secret: SECRET,
      handlers: {
        post_published: () => {
          throw failure;
        },
      },
      onError,
    });
    const response = await respond(post(BODY, await generateWebhookSignature(BODY, SECRET)));
    expect(response.status).toBe(500);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('reads the secret from the environment and fails closed without one', async () => {
    vi.stubEnv('HASHNODE_WEBHOOK_SECRET', '');
    const respond = createWebhookHandler({ handlers: {} });
    expect((await respond(post(BODY, null))).status).toBe(500);

    vi.stubEnv('HASHNODE_WEBHOOK_SECRET', SECRET);
    const response = await respond(post(BODY, await generateWebhookSignature(BODY, SECRET)));
    expect(response.status).toBe(200);
    vi.unstubAllEnvs();
  });
});
