/**
 * Webhook Utilities for Hashnode API
 * 
 * **Webhook Management Module** providing validation and helper functions.
 * This module helps with webhook payload validation, signature verification,
 * and type-safe webhook event handling.
 * 
 * @module lib/api/hashnode/webhooks
 * 
 * @features
 * - Webhook signature verification using HMAC-SHA256
 * - Type-safe webhook payload parsing
 * - Event type validation
 * - Helper functions for webhook handling
 * 
 * @example Verify Webhook Signature
 * ```typescript
 * import { verifyWebhookSignature } from '@/lib/api/hashnode/webhooks';
 * 
 * const isValid = verifyWebhookSignature(
 *   payload,
 *   signature,
 *   secret
 * );
 * ```
 */

import crypto from 'crypto';
import type { WebhookEvent } from './types';

/**
 * Webhook payload structure
 * This represents the data sent by Hashnode when a webhook is triggered
 */
export interface WebhookPayload {
  event: WebhookEvent;
  data: {
    post?: {
      id: string;
      title: string;
      slug: string;
      publishedAt: string;
      url: string;
      author: {
        id: string;
        name: string;
        username: string;
      };
    };
    staticPage?: {
      id: string;
      title: string;
      slug: string;
      url: string;
    };
  };
  publication: {
    id: string;
    title: string;
    url: string;
  };
  timestamp: string;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * 
 * Hashnode signs webhook payloads with your secret key.
 * Use this function to verify the webhook came from Hashnode.
 * 
 * @param payload - Raw webhook payload (JSON string)
 * @param signature - Signature from X-Hashnode-Signature header
 * @param secret - Your webhook secret from Hashnode
 * @returns True if signature is valid
 * 
 * @example
 * ```typescript
 * const payload = req.body;
 * const signature = req.headers['x-hashnode-signature'];
 * const isValid = verifyWebhookSignature(
 *   JSON.stringify(payload),
 *   signature,
 *   process.env.WEBHOOK_SECRET
 * );
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Parse and validate webhook payload
 * 
 * @param payload - Raw webhook payload string
 * @returns Parsed and typed webhook payload
 * @throws Error if payload is invalid
 * 
 * @example
 * ```typescript
 * try {
 *   const webhookData = parseWebhookPayload(req.body);
 *   console.log('Event:', webhookData.event);
 *   console.log('Post:', webhookData.data.post?.title);
 * } catch (error) {
 *   console.error('Invalid webhook payload');
 * }
 * ```
 */
export function parseWebhookPayload(payload: string | WebhookPayload): WebhookPayload {
  let data: WebhookPayload;

  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch {
      throw new Error('Invalid JSON payload');
    }
  } else {
    data = payload;
  }

  // Validate required fields
  if (!data.event || !data.publication || !data.timestamp) {
    throw new Error('Missing required webhook fields');
  }

  // Validate event type
  const validEvents: WebhookEvent[] = [
    'POST_PUBLISHED',
    'POST_UPDATED',
    'POST_DELETED',
    'STATIC_PAGE_PUBLISHED',
    'STATIC_PAGE_UPDATED',
    'STATIC_PAGE_DELETED',
  ];

  if (!validEvents.includes(data.event)) {
    throw new Error(`Invalid webhook event: ${data.event}`);
  }

  return data;
}

/**
 * Check if webhook event is a post event
 * 
 * @param event - Webhook event type
 * @returns True if event is post-related
 * 
 * @example
 * ```typescript
 * if (isPostEvent(webhook.event)) {
 *   console.log('Post event:', webhook.data.post?.title);
 * }
 * ```
 */
export function isPostEvent(event: WebhookEvent): boolean {
  return event === 'POST_PUBLISHED' || 
         event === 'POST_UPDATED' || 
         event === 'POST_DELETED';
}

/**
 * Check if webhook event is a static page event
 * 
 * @param event - Webhook event type
 * @returns True if event is static page-related
 * 
 * @example
 * ```typescript
 * if (isStaticPageEvent(webhook.event)) {
 *   console.log('Page event:', webhook.data.staticPage?.title);
 * }
 * ```
 */
export function isStaticPageEvent(event: WebhookEvent): boolean {
  return event === 'STATIC_PAGE_PUBLISHED' || 
         event === 'STATIC_PAGE_UPDATED' || 
         event === 'STATIC_PAGE_DELETED';
}

/**
 * Generate webhook signature for testing
 * Use this to generate valid signatures when testing webhook endpoints
 * 
 * @param payload - Webhook payload string
 * @param secret - Webhook secret
 * @returns Generated signature
 * 
 * @example
 * ```typescript
 * const testPayload = JSON.stringify({ event: 'POST_PUBLISHED', ... });
 * const signature = generateWebhookSignature(testPayload, 'my-secret');
 * 
 * // Use in test request
 * fetch('/api/webhook', {
 *   method: 'POST',
 *   headers: {
 *     'X-Hashnode-Signature': signature
 *   },
 *   body: testPayload
 * });
 * ```
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Webhook event handler type
 * Use this type for type-safe webhook event handlers
 */
export type WebhookHandler = (payload: WebhookPayload) => Promise<void> | void;

/**
 * Webhook event handlers registry
 * Map webhook events to handler functions
 * 
 * @example
 * ```typescript
 * const handlers: WebhookHandlers = {
 *   POST_PUBLISHED: async (payload) => {
 *     console.log('New post:', payload.data.post?.title);
 *     await revalidatePath(`/blog/${payload.data.post?.slug}`);
 *   },
 *   POST_UPDATED: async (payload) => {
 *     console.log('Updated post:', payload.data.post?.title);
 *     await revalidatePath(`/blog/${payload.data.post?.slug}`);
 *   },
 * };
 * 
 * // In API route
 * const handler = handlers[webhookPayload.event];
 * if (handler) {
 *   await handler(webhookPayload);
 * }
 * ```
 */
export type WebhookHandlers = Partial<Record<WebhookEvent, WebhookHandler>>;

/**
 * Process webhook with event handlers
 * 
 * @param payload - Webhook payload
 * @param handlers - Map of event handlers
 * @returns Promise that resolves when handler completes
 * 
 * @example
 * ```typescript
 * await processWebhook(webhookPayload, {
 *   POST_PUBLISHED: async (payload) => {
 *     await revalidatePath(`/blog/${payload.data.post?.slug}`);
 *   }
 * });
 * ```
 */
export async function processWebhook(
  payload: WebhookPayload,
  handlers: WebhookHandlers
): Promise<void> {
  const handler = handlers[payload.event];
  
  if (!handler) {
    console.warn(`No handler registered for event: ${payload.event}`);
    return;
  }

  await handler(payload);
}
