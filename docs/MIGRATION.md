# Migration Guide

Guide for migrating from v1.x to v2.0 and upgrading between versions.

## Table of Contents

- [v1.x to v2.0 Migration](#v1x-to-v20-migration)
- [Breaking Changes](#breaking-changes)
- [New Features](#new-features)
- [Deprecation Notices](#deprecation-notices)
- [Step-by-Step Migration](#step-by-step-migration)

---

## v1.x to v2.0 Migration

### Overview

Version 2.0 is a **major upgrade** that adds extensive new features while maintaining **99% backward compatibility** with v1.x. Only minor breaking changes in edge cases.

### Compatibility Matrix

| Feature | v1.x | v2.0 | Breaking? |
|---------|------|------|-----------|
| `getBlogPosts()` | ✅ | ✅ | No |
| `getBlogPostBySlug()` | ✅ | ✅ | No |
| `getPublication()` | ✅ | ✅ | No |
| `searchPosts()` | ❌ | ✅ | New |
| `getSeries()` / `getSeriesList()` | ❌ | ✅ | New |
| `getStaticPages()` | ❌ | ✅ | New |
| `getPostComments()` | ❌ | ✅ | New |
| `getDrafts()` | ❌ | ✅ | New |
| Webhook utilities | ❌ | ✅ | New |
| Type exports | Partial | Full | Enhanced |

---

## Breaking Changes

### 1. Type Export Paths (Minor)

**v1.x:**
```typescript
// Types were exported from main entry point only
import { BlogPost } from '@jowinjohnchemban/hashnode-client';
```

**v2.0:**
```typescript
// Types still exported from main entry point (backward compatible)
import { BlogPost } from '@jowinjohnchemban/hashnode-client';

// NEW: Can also import from /types subpath
import type { BlogPost } from '@jowinjohnchemban/hashnode-client/types';
```

**Action Required:** None - old imports still work

---

### 2. PageInfo Structure (Enhanced)

**v1.x:**
```typescript
interface PageInfo {
  hasNextPage?: boolean;
  endCursor?: string;
}
```

**v2.0:**
```typescript
interface PageInfo {
  hasNextPage: boolean;    // No longer optional
  endCursor: string | null; // Explicitly nullable
}
```

**Impact:** Minimal - only affects manual PageInfo construction

**Action Required:** Update custom PageInfo objects:
```typescript
// v1.x
const pageInfo: PageInfo = { hasNextPage: true };

// v2.0
const pageInfo: PageInfo = { 
  hasNextPage: true, 
  endCursor: null 
};
```

---

### 3. Error Handling (No Change)

Error handling behavior **unchanged** - all facade functions still return safe defaults:

```typescript
// v1.x and v2.0 - identical behavior
const posts = await getBlogPosts(10); // Returns [] on error
const post = await getBlogPostBySlug('slug'); // Returns null on error
```

---

## New Features

### 1. Search Functionality

```typescript
// NEW in v2.0
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

const results = await searchPosts('typescript', 20);
```

### 2. Series Management

```typescript
// NEW in v2.0
import { getSeriesList, getSeries, getSeriesPosts } from '@jowinjohnchemban/hashnode-client';

const allSeries = await getSeriesList(10);
const series = await getSeries('my-series-slug');
const posts = await getSeriesPosts('my-series-slug', 50);
```

### 3. Static Pages

```typescript
// NEW in v2.0
import { getStaticPages, getStaticPage } from '@jowinjohnchemban/hashnode-client';

const pages = await getStaticPages();
const aboutPage = await getStaticPage('about');
```

### 4. Comments & Discussion

```typescript
// NEW in v2.0
import { getPostComments } from '@jowinjohnchemban/hashnode-client';

const comments = await getPostComments('post-id', 20);
```

### 5. Recommendations

```typescript
// NEW in v2.0
import { getRecommendedPublications } from '@jowinjohnchemban/hashnode-client';

const recommended = await getRecommendedPublications();
```

### 6. Draft Management

```typescript
// NEW in v2.0 (requires authentication)
import { getDrafts } from '@jowinjohnchemban/hashnode-client';

// Set HASHNODE_ACCESS_TOKEN env var
const drafts = await getDrafts(10);
```

### 7. Webhook Utilities

```typescript
// NEW in v2.0
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhook,
  type WebhookHandlers
} from '@jowinjohnchemban/hashnode-client';

// Verify webhook signature
const isValid = verifyWebhookSignature(payload, signature, secret);

// Parse webhook
const webhook = parseWebhookPayload(payload);

// Process with handlers
const handlers: WebhookHandlers = {
  POST_PUBLISHED: async (data) => {
    console.log('New post:', data.data.post?.title);
  }
};
await processWebhook(webhook, handlers);
```

---

## Deprecation Notices

### No Deprecations in v2.0

All v1.x APIs are fully supported in v2.0. No features have been deprecated.

---

## Step-by-Step Migration

### Step 1: Update Package

```bash
npm install @jowinjohnchemban/hashnode-client@latest
```

Or update `package.json`:
```json
{
  "dependencies": {
    "@jowinjohnchemban/hashnode-client": "^2.0.0"
  }
}
```

### Step 2: Run Existing Code

Your existing v1.x code should work **without changes**:

```typescript
// This still works in v2.0
import { getBlogPosts, getBlogPostBySlug, getPublication } from '@jowinjohnchemban/hashnode-client';

const posts = await getBlogPosts(10);
const post = await getBlogPostBySlug('my-slug');
const pub = await getPublication();
```

### Step 3: Update Types (Optional)

If you're using TypeScript, update type imports for better organization:

```typescript
// v1.x
import { BlogPost, Publication } from '@jowinjohnchemban/hashnode-client';

// v2.0 (optional, better tree-shaking)
import type { BlogPost, Publication } from '@jowinjohnchemban/hashnode-client/types';
```

### Step 4: Add New Features (Optional)

Gradually add new v2.0 features as needed:

```typescript
import { 
  getBlogPosts,           // v1.x feature
  searchPosts,            // v2.0 feature
  getSeriesList,          // v2.0 feature
  getPostComments         // v2.0 feature
} from '@jowinjohnchemban/hashnode-client';
```

### Step 5: Test

Run your test suite to ensure everything works:

```bash
npm test
```

---

## Common Migration Scenarios

### Scenario 1: Basic Blog (No Changes Needed)

**v1.x Code:**
```typescript
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

export async function getBlogData() {
  const posts = await getBlogPosts(10);
  return { posts };
}

export async function getPostData(slug: string) {
  const post = await getBlogPostBySlug(slug);
  return { post };
}
```

**v2.0 Migration:**
```typescript
// Exact same code works in v2.0 - no changes needed! ✅
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

export async function getBlogData() {
  const posts = await getBlogPosts(10);
  return { posts };
}

export async function getPostData(slug: string) {
  const post = await getBlogPostBySlug(slug);
  return { post };
}
```

---

### Scenario 2: Adding Search Feature

**v1.x Implementation (Manual):**
```typescript
// Had to implement search manually or use external service
async function searchBlog(query: string) {
  const allPosts = await getBlogPosts(100);
  return allPosts.filter(post => 
    post.title.toLowerCase().includes(query.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(query.toLowerCase())
  );
}
```

**v2.0 Migration (Built-in):**
```typescript
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

// Now uses Hashnode's native search API
async function searchBlog(query: string) {
  return await searchPosts(query, 20);
}
```

---

### Scenario 3: Adding Series Support

**v1.x Implementation (Not Possible):**
```typescript
// Series data was not accessible in v1.x
```

**v2.0 Migration (New Feature):**
```typescript
import { getSeriesList, getSeries, getSeriesPosts } from '@jowinjohnchemban/hashnode-client';

async function getSeriesPage(slug: string) {
  const [series, posts] = await Promise.all([
    getSeries(slug),
    getSeriesPosts(slug, 100)
  ]);
  
  return { series, posts };
}
```

---

### Scenario 4: Webhook Integration

**v1.x Implementation (Manual):**
```typescript
import crypto from 'crypto';

// Had to implement signature verification manually
function verifyWebhook(payload: string, signature: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return digest === signature;
}
```

**v2.0 Migration (Built-in):**
```typescript
import { verifyWebhookSignature, parseWebhookPayload, processWebhook } from '@jowinjohnchemban/hashnode-client';

// Now uses built-in utilities with timing-safe comparison
const isValid = verifyWebhookSignature(payload, signature, secret);

if (isValid) {
  const webhook = parseWebhookPayload(payload);
  await processWebhook(webhook, handlers);
}
```

---

### Scenario 5: Type Safety Improvements

**v1.x:**
```typescript
import { BlogPost } from '@jowinjohnchemban/hashnode-client';

// Limited type exports
const post: BlogPost = await getBlogPostBySlug('slug');
```

**v2.0:**
```typescript
import type { 
  BlogPost, 
  BlogPostDetail,
  Series,
  StaticPage,
  Comment,
  Draft,
  Webhook,
  WebhookPayload
} from '@jowinjohnchemban/hashnode-client/types';

// Full type coverage for all features
const post: BlogPostDetail = await getBlogPostBySlug('slug');
const series: Series = await getSeries('series-slug');
const comments: Comment[] = await getPostComments('post-id');
```

---

## Testing Migration

### Unit Tests

Update test mocks to include new features:

```typescript
// v1.x mock
jest.mock('@jowinjohnchemban/hashnode-client', () => ({
  getBlogPosts: jest.fn().mockResolvedValue([]),
}));

// v2.0 mock (backward compatible + new features)
jest.mock('@jowinjohnchemban/hashnode-client', () => ({
  getBlogPosts: jest.fn().mockResolvedValue([]),
  searchPosts: jest.fn().mockResolvedValue([]),
  getSeries: jest.fn().mockResolvedValue(null),
  // ... other new functions
}));
```

### Integration Tests

Test new features with real API calls:

```typescript
import { searchPosts, getSeriesList, getPostComments } from '@jowinjohnchemban/hashnode-client';

describe('v2.0 New Features', () => {
  it('should search posts', async () => {
    const results = await searchPosts('test', 5);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should fetch series', async () => {
    const series = await getSeriesList(5);
    expect(Array.isArray(series)).toBe(true);
  });

  it('should fetch comments', async () => {
    const posts = await getBlogPosts(1);
    if (posts[0]) {
      const comments = await getPostComments(posts[0].id, 5);
      expect(Array.isArray(comments)).toBe(true);
    }
  });
});
```

---

## Performance Considerations

### v2.0 Optimizations

1. **Improved Caching**: Same 5-minute cache strategy but with better cache key management
2. **Parallel Fetching**: New features designed for parallel execution
3. **Fragment Reuse**: More efficient GraphQL queries with fragment composition

### Migration Performance Impact

- **No negative impact** on existing v1.x code
- **Improved performance** when using parallel fetching for new features

```typescript
// Efficient parallel fetching in v2.0
const [posts, series, pages, recommended] = await Promise.all([
  getBlogPosts(10),
  getSeriesList(5),
  getStaticPages(5),
  getRecommendedPublications()
]);
```

---

## Environment Variables

### v1.x Requirements

```bash
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
```

### v2.0 Requirements

```bash
# Required (same as v1.x)
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev

# Optional - for new features
HASHNODE_ACCESS_TOKEN=your-token        # For getDrafts()
HASHNODE_WEBHOOK_SECRET=your-secret     # For webhook verification
```

**Action Required:** Add optional environment variables only if using new features

---

## Rollback Plan

If you encounter issues with v2.0:

### Option 1: Pin to v1.x

```bash
npm install @jowinjohnchemban/hashnode-client@1
```

Or in `package.json`:
```json
{
  "dependencies": {
    "@jowinjohnchemban/hashnode-client": "^1.0.13"
  }
}
```

### Option 2: Report Issue

Open an issue on GitHub with:
- Error message
- Code sample
- Expected vs actual behavior
- Environment details

---

## FAQ

### Q: Do I need to change my existing code?

**A:** No, all v1.x code works in v2.0 without changes.

### Q: Are there any breaking changes?

**A:** Only minor type changes that don't affect typical usage. See [Breaking Changes](#breaking-changes) section.

### Q: Can I use v2.0 features alongside v1.x code?

**A:** Yes, mix and match as needed:
```typescript
const posts = await getBlogPosts(10);      // v1.x
const results = await searchPosts('test'); // v2.0
```

### Q: How do I test webhooks locally?

**A:** Use ngrok or similar to expose local server. See [docs/DEVELOPMENT.md](./DEVELOPMENT.md) for details.

### Q: What if I only want v1.x features?

**A:** Just use v1.x imports - new features are opt-in:
```typescript
import { getBlogPosts, getBlogPostBySlug, getPublication } from '@jowinjohnchemban/hashnode-client';
// That's it - you're using v2.0 with v1.x features only
```

### Q: How do I get authentication token for drafts?

**A:** Generate Personal Access Token in Hashnode settings → Developer → Generate Token

---

## Support

Need help migrating? Open an issue or discussion on GitHub.

## Resources

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Development Guide](./DEVELOPMENT.md) - Contributing and development
- [Feature List](./FEATURES.md) - All v2.0 features
- [Examples](../examples/) - Usage examples

---

## License

MIT License - See [LICENSE](../LICENSE) for details
