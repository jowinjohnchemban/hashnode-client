# Webhooks

Hashnode can call your server when a post or static page is published, updated or deleted. Use this to rebuild pages, purge caches or notify other systems. Webhooks are a Hashnode Pro feature.

## Set up the webhook in Hashnode

1. Open your blog dashboard → **Webhooks** → **Add webhook**.
2. Enter your endpoint URL (HTTPS), for example `https://example.com/api/hashnode`.
3. Choose the events you need.
4. Copy the secret and store it as `HASHNODE_WEBHOOK_SECRET` on your server.

## Handle deliveries

### Fetch API (Next.js, Hono, Bun, Deno, Cloudflare Workers)

`createWebhookHandler` returns a `(request: Request) => Promise<Response>` function that verifies the signature, parses the body and calls your handler:

```ts
import { createWebhookHandler } from '@jowinjohnchemban/hashnode-client/webhooks';

export const POST = createWebhookHandler({
  // secret: '...',        // defaults to HASHNODE_WEBHOOK_SECRET
  // toleranceSeconds: 300, // reject signatures older than this; null disables the check
  handlers: {
    post_published: async ({ data }) => {
      console.log('Published post', data.post?.id);
    },
    post_deleted: async ({ data }) => {
      console.log('Deleted post', data.post?.id);
    },
    '*': ({ data }) => console.log('Event', data.eventType), // runs for every event
  },
  onError: (error) => console.error('Webhook handler failed', error),
});
```

| Response | When                                                        |
| -------- | ----------------------------------------------------------- |
| `200`    | Valid delivery; body `{ received: true, handled: boolean }` |
| `400`    | The signature is valid but the body is malformed            |
| `401`    | Missing, invalid or expired signature                       |
| `500`    | A handler threw, or no secret is configured                 |

### Other frameworks

Verify the **raw** body before parsing it. Re-serialized JSON won't match the signature.

```ts
import express from 'express';
import {
  parseWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@jowinjohnchemban/hashnode-client/webhooks';

app.post('/api/hashnode', express.text({ type: '*/*' }), async (req, res) => {
  const valid = await verifyWebhookSignature({
    payload: req.body,
    signature: req.get(WEBHOOK_SIGNATURE_HEADER),
    secret: process.env.HASHNODE_WEBHOOK_SECRET!,
  });
  if (!valid) return res.sendStatus(401);

  const { data } = parseWebhookPayload(req.body);
  // ...
  res.sendStatus(200);
});
```

## Payload

Deliveries carry IDs, not content. Fetch the content with the client:

```ts
interface WebhookPayload {
  metadata: { uuid: string };
  data: {
    eventType: string; // see below
    publication: { id: string };
    post?: { id: string };
    staticPage?: { id: string };
  };
}

const post = data.post && (await hashnode.getPostById(data.post.id));
```

| Events       | `eventType` values                                                   |
| ------------ | -------------------------------------------------------------------- |
| Posts        | `post_published`, `post_updated`, `post_deleted`                     |
| Static pages | `static_page_published`, `static_page_edited`, `static_page_deleted` |

`isPostEvent(type)` and `isStaticPageEvent(type)` narrow the type. Unknown future events are passed through as strings, so add a `'*'` handler if you want to see them.

## Signature format

```
x-hashnode-signature: t=<unix timestamp>,v1=<hex HMAC-SHA256>
```

The HMAC is computed with your secret over `"<timestamp>.<raw body>"`. Verification:

- compares signatures in constant time
- accepts several `v1` values (useful while rotating secrets)
- accepts second or millisecond timestamps
- rejects timestamps more than `toleranceSeconds` (default 300) from the current time, which blocks replayed deliveries

> [!NOTE]
> Hashnode's current documentation doesn't describe the signing scheme. This implementation follows Hashnode's previously published format. If real deliveries fail verification, please [open an issue](https://github.com/jowinjohnchemban/hashnode-client/issues/new/choose) with the header format you receive. Leave out the secret.

## Testing

Sign a payload yourself to test your endpoint locally:

```ts
import { generateWebhookSignature } from '@jowinjohnchemban/hashnode-client/webhooks';

const body = JSON.stringify({
  metadata: { uuid: 'test' },
  data: { eventType: 'post_published', publication: { id: 'pub' }, post: { id: 'post' } },
});

await fetch('http://localhost:3000/api/hashnode', {
  method: 'POST',
  headers: { 'x-hashnode-signature': await generateWebhookSignature(body, 'my-secret') },
  body,
});
```

To receive real deliveries on your machine, expose the local server with a tunnel such as `cloudflared` or `ngrok`, and use its URL in the Hashnode dashboard.

## Security checklist

- Always verify the signature before acting on a delivery.
- Keep the secret in an environment variable, and rotate it if it leaks.
- Make handlers idempotent: Hashnode may deliver an event more than once. Use `metadata.uuid` to de-duplicate.
- Respond quickly. Do slow work in the background.
