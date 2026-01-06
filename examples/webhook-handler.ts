/**
 * Webhook Handler Example
 * 
 * This example demonstrates how to handle Hashnode webhooks in a Next.js API route
 * or Express.js server. It includes signature verification and event processing.
 */

import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhook,
  isPostEvent,
  isStaticPageEvent,
  type WebhookPayload,
  type WebhookHandlers,
} from '../webhooks';

/**
 * Example: Next.js API Route Handler
 * 
 * File: app/api/webhook/route.ts (Next.js 13+ App Router)
 * or pages/api/webhook.ts (Next.js Pages Router)
 */

// For Next.js App Router
export async function POST(request: Request) {
  try {
    // 1. Get raw body and signature from headers
    const payload = await request.text();
    const signature = request.headers.get('x-hashnode-signature') || '';
    const webhookSecret = process.env.HASHNODE_WEBHOOK_SECRET!;

    if (!webhookSecret) {
      console.error('❌ HASHNODE_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // 2. Verify webhook signature (CRITICAL for security)
    console.log('🔐 Verifying webhook signature...');
    const isValidSignature = verifyWebhookSignature(payload, signature, webhookSecret);
    
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature - possible attack attempt');
      return new Response('Invalid signature', { status: 401 });
    }

    console.log('✅ Signature verified successfully');

    // 3. Parse and validate webhook payload
    let webhookData: WebhookPayload;
    try {
      webhookData = parseWebhookPayload(payload);
      console.log(`📨 Received webhook event: ${webhookData.event}`);
    } catch (error) {
      console.error('❌ Invalid webhook payload:', error);
      return new Response('Invalid payload', { status: 400 });
    }

    // 4. Process webhook based on event type
    await handleWebhookEvent(webhookData);

    // 5. Return success response
    return new Response('Webhook processed successfully', { status: 200 });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Webhook event handler function
 * This is where you implement your business logic
 */
async function handleWebhookEvent(payload: WebhookPayload): Promise<void> {
  // Define handlers for each event type
  const handlers: WebhookHandlers = {
    
    // Handle new post published
    POST_PUBLISHED: async (data) => {
      console.log('📝 New post published!');
      console.log(`   Title: ${data.data.post?.title}`);
      console.log(`   URL: ${data.data.post?.url}`);
      console.log(`   Author: ${data.data.post?.author.name}`);
      
      // Example: Revalidate Next.js cache
      // const { revalidatePath } = await import('next/cache');
      // await revalidatePath(`/blog/${data.data.post?.slug}`);
      // await revalidatePath('/blog'); // Revalidate blog list page
      
      // Example: Send notification
      // await sendNotification({
      //   title: 'New Blog Post',
      //   message: `${data.data.post?.title} was published`,
      // });
      
      // Example: Update database
      // await db.posts.create({
      //   id: data.data.post?.id,
      //   slug: data.data.post?.slug,
      //   title: data.data.post?.title,
      //   publishedAt: data.data.post?.publishedAt,
      // });
    },

    // Handle post updated
    POST_UPDATED: async (data) => {
      console.log('✏️  Post updated!');
      console.log(`   Title: ${data.data.post?.title}`);
      console.log(`   URL: ${data.data.post?.url}`);
      
      // Example: Revalidate cache
      // const { revalidatePath } = await import('next/cache');
      // await revalidatePath(`/blog/${data.data.post?.slug}`);
    },

    // Handle post deleted
    POST_DELETED: async (data) => {
      console.log('🗑️  Post deleted!');
      console.log(`   Post ID: ${data.data.post?.id}`);
      console.log(`   Slug: ${data.data.post?.slug}`);
      
      // Example: Remove from database
      // await db.posts.delete({ id: data.data.post?.id });
      
      // Example: Revalidate cache
      // const { revalidatePath } = await import('next/cache');
      // await revalidatePath('/blog');
    },

    // Handle static page published
    STATIC_PAGE_PUBLISHED: async (data) => {
      console.log('📄 New static page published!');
      console.log(`   Title: ${data.data.staticPage?.title}`);
      console.log(`   URL: ${data.data.staticPage?.url}`);
      
      // Example: Revalidate page
      // const { revalidatePath } = await import('next/cache');
      // await revalidatePath(`/${data.data.staticPage?.slug}`);
    },

    // Handle static page updated
    STATIC_PAGE_UPDATED: async (data) => {
      console.log('✏️  Static page updated!');
      console.log(`   Title: ${data.data.staticPage?.title}`);
      
      // Example: Revalidate page
      // const { revalidatePath } = await import('next/cache');
      // await revalidatePath(`/${data.data.staticPage?.slug}`);
    },

    // Handle static page deleted
    STATIC_PAGE_DELETED: async (data) => {
      console.log('🗑️  Static page deleted!');
      console.log(`   Page ID: ${data.data.staticPage?.id}`);
    },
  };

  // Process the webhook with the handlers
  await processWebhook(payload, handlers);

  // Alternative: Handle events manually
  if (isPostEvent(payload.event)) {
    console.log('📰 This is a post-related event');
    console.log(`   Post details:`, payload.data.post);
  }

  if (isStaticPageEvent(payload.event)) {
    console.log('📄 This is a static page-related event');
    console.log(`   Page details:`, payload.data.staticPage);
  }
}

/**
 * Example: Express.js Webhook Handler
 */
/*
import express from 'express';

const app = express();

// IMPORTANT: Use express.text() to get raw body for signature verification
app.post('/webhook', express.text({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body as string;
    const signature = req.headers['x-hashnode-signature'] as string;
    const webhookSecret = process.env.HASHNODE_WEBHOOK_SECRET!;

    // Verify signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse and process
    const webhookData = parseWebhookPayload(payload);
    await handleWebhookEvent(webhookData);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
*/

/**
 * Testing Webhooks Locally
 * 
 * 1. Use ngrok to expose your local server:
 *    ngrok http 3000
 * 
 * 2. Configure webhook in Hashnode dashboard:
 *    - URL: https://your-ngrok-url.ngrok.io/api/webhook
 *    - Secret: Your secret key (save in .env)
 *    - Events: Select POST_PUBLISHED, POST_UPDATED, etc.
 * 
 * 3. Publish/update a post in Hashnode
 * 
 * 4. Check your server logs for webhook data
 */

/**
 * Production Deployment Checklist
 * 
 * ✅ Set HASHNODE_WEBHOOK_SECRET environment variable
 * ✅ Use HTTPS (webhooks only work over HTTPS)
 * ✅ Implement proper error handling and logging
 * ✅ Add retry logic for failed webhook processing
 * ✅ Monitor webhook delivery in Hashnode dashboard
 * ✅ Test signature verification thoroughly
 * ✅ Implement rate limiting if needed
 * ✅ Log all webhook events for debugging
 */

// Export for testing
export { handleWebhookEvent };
