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
export declare function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
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
export declare function parseWebhookPayload(payload: string | WebhookPayload): WebhookPayload;
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
export declare function isPostEvent(event: WebhookEvent): boolean;
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
export declare function isStaticPageEvent(event: WebhookEvent): boolean;
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
export declare function generateWebhookSignature(payload: string, secret: string): string;
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
export declare function processWebhook(payload: WebhookPayload, handlers: WebhookHandlers): Promise<void>;
//# sourceMappingURL=webhooks.d.ts.map