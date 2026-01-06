"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.parseWebhookPayload = parseWebhookPayload;
exports.isPostEvent = isPostEvent;
exports.isStaticPageEvent = isStaticPageEvent;
exports.generateWebhookSignature = generateWebhookSignature;
exports.processWebhook = processWebhook;
const crypto_1 = __importDefault(require("crypto"));
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
function verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
        return false;
    }
    try {
        const hmac = crypto_1.default.createHmac('sha256', secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');
        // Use timing-safe comparison to prevent timing attacks
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    catch {
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
function parseWebhookPayload(payload) {
    let data;
    if (typeof payload === 'string') {
        try {
            data = JSON.parse(payload);
        }
        catch {
            throw new Error('Invalid JSON payload');
        }
    }
    else {
        data = payload;
    }
    // Validate required fields
    if (!data.event || !data.publication || !data.timestamp) {
        throw new Error('Missing required webhook fields');
    }
    // Validate event type
    const validEvents = [
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
function isPostEvent(event) {
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
function isStaticPageEvent(event) {
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
function generateWebhookSignature(payload, secret) {
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
}
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
async function processWebhook(payload, handlers) {
    const handler = handlers[payload.event];
    if (!handler) {
        console.warn(`No handler registered for event: ${payload.event}`);
        return;
    }
    await handler(payload);
}
//# sourceMappingURL=webhooks.js.map