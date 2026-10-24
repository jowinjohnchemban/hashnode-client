# Webhooks

Full guide: https://github.com/jowinjohnchemban/hashnode-client/blob/main/docs/WEBHOOKS.md

Set up the webhook in the Hashnode dashboard (Webhooks, Add webhook), choose events, and store its secret as `HASHNODE_WEBHOOK_SECRET`.

## Fetch API frameworks (Next.js, Hono, Bun, Deno, Workers)

```ts
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  handlers: {
    post_published: async ({ data }) => {
      // data.post?.id; fetch the post with hashnode.getPostById(id)
    },
    '*': ({ data }) => console.log('event', data.eventType),
  },
});
```

Responses: `200` handled, `400` malformed or unreadable body, `401` bad or expired signature, `405` not POST, `500` handler error or missing secret.

## Express and other frameworks

Verify the raw body before parsing it; re-serialized JSON won't match the signature.

```ts
import express from 'express';
import {
  parseWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@jowinjohnchemban/hashnode-client/webhooks';

const app = express();
app.post('/api/hashnode', express.text({ type: '*/*' }), async (req, res) => {
  const valid = await verifyWebhookSignature({
    payload: req.body,
    signature: req.get(WEBHOOK_SIGNATURE_HEADER),
    secret: process.env.HASHNODE_WEBHOOK_SECRET ?? '',
  });
  if (!valid) return res.sendStatus(401);
  const { data } = parseWebhookPayload(req.body);
  console.log(data.eventType, data.post?.id);
  return res.sendStatus(200);
});
```

## Events and payload

`data.eventType` is one of `post_published`, `post_updated`, `post_deleted`, `static_page_published`, `static_page_edited`, `static_page_deleted`. The payload holds IDs (`data.post.id`, `data.staticPage.id`, `data.publication.id`), not content. Use `isPostEvent` and `isStaticPageEvent` to narrow the type.

## Testing locally

```ts
import { generateWebhookSignature } from '@jowinjohnchemban/hashnode-client/webhooks';

const body = JSON.stringify({
  metadata: { uuid: 'test' },
  data: { eventType: 'post_published', publication: { id: 'p' }, post: { id: 'x' } },
});
await fetch('http://localhost:3000/api/hashnode', {
  method: 'POST',
  headers: { 'x-hashnode-signature': await generateWebhookSignature(body, 'my-secret') },
  body,
});
```

Make handlers idempotent (deliveries can repeat; use `metadata.uuid`) and respond quickly.
