/**
 * Webhook endpoints.
 *
 * Set HASHNODE_WEBHOOK_SECRET to the secret shown in the Hashnode dashboard.
 */

import {
  createWebhookHandler,
  isPostEvent,
  parseWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@jowinjohnchemban/hashnode-client/webhooks';

// Stand-in for `import { revalidateTag } from 'next/cache'`.
declare function revalidateTag(tag: string): void;

/**
 * Next.js App Router: app/api/hashnode/route.ts
 *
 * Verifies the signature, parses the body and calls the matching handler.
 */
export const POST = createWebhookHandler({
  handlers: {
    post_published: ({ data }) => {
      revalidateTag('hashnode');
      console.log('Published post', data.post?.id);
    },
    post_updated: ({ data }) => {
      revalidateTag(`post:${data.post?.id}`);
    },
    post_deleted: () => {
      revalidateTag('hashnode');
    },
    '*': ({ data }) => {
      console.log('Hashnode event', data.eventType);
    },
  },
  onError: (error) => {
    console.error('Webhook handler failed', error);
  },
});

/**
 * Any other framework: verify with the raw body before parsing it.
 * The body must be the exact bytes Hashnode sent, not re-serialized JSON.
 */
export async function handleRawWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): Promise<number> {
  const valid = await verifyWebhookSignature({
    payload: rawBody,
    signature: headers[WEBHOOK_SIGNATURE_HEADER],
    secret: process.env.HASHNODE_WEBHOOK_SECRET ?? '',
  });
  if (!valid) return 401;

  const payload = parseWebhookPayload(rawBody);
  if (isPostEvent(payload.data.eventType)) {
    console.log(`${payload.data.eventType}: post ${payload.data.post?.id}`);
  }
  return 200;
}
