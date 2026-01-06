# API Reference

Complete API documentation for `@jowinjohnchemban/hashnode-client` v2.0.0

## Table of Contents

- [Core Functions](#core-functions)
- [Search Functions](#search-functions)
- [Series Functions](#series-functions)
- [Static Pages](#static-pages)
- [Comments & Discussion](#comments--discussion)
- [Recommendations](#recommendations)
- [Draft Management](#draft-management)
- [Webhook Utilities](#webhook-utilities)
- [Direct Service Access](#direct-service-access)

---

## Core Functions

### `getPublication()`

Fetches publication metadata including SEO information.

**Returns:** `Promise<Publication | null>`

```typescript
import { getPublication } from '@jowinjohnchemban/hashnode-client';

const publication = await getPublication();
console.log(publication?.title);
console.log(publication?.descriptionSEO);
```

**Response Type:**
```typescript
interface Publication {
  id: string;
  title: string;
  url: string;
  displayTitle?: string;
  descriptionSEO?: string;
  about?: { html: string };
  favicon?: string;
  headerColor?: string;
  metaTags?: string;
  author: Author;
}
```

---

### `getBlogPosts(limit?)`

Fetches recent blog posts with pagination support.

**Parameters:**
- `limit?: number` - Number of posts to fetch (default: 10, max: 20)

**Returns:** `Promise<BlogPost[]>`

```typescript
import { getBlogPosts } from '@jowinjohnchemban/hashnode-client';

// Get 5 most recent posts
const posts = await getBlogPosts(5);

posts.forEach(post => {
  console.log(post.title);
  console.log(post.slug);
  console.log(post.excerpt);
});
```

**Response Type:**
```typescript
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  readTimeInMinutes: number;
  coverImage?: CoverImage;
  author: Author;
  tags?: Tag[];
  views: number;
  reactionCount: number;
  responseCount: number;
}
```

---

### `getBlogPostBySlug(slug)`

Fetches a single blog post with full content by its slug.

**Parameters:**
- `slug: string` - The post slug

**Returns:** `Promise<BlogPostDetail | null>`

```typescript
import { getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

const post = await getBlogPostBySlug('my-post-slug');

if (post) {
  console.log(post.title);
  console.log(post.content?.html); // Full HTML content
  console.log(post.content?.markdown); // Markdown source
}
```

**Response Type:**
```typescript
interface BlogPostDetail extends BlogPost {
  content?: {
    html: string;
    markdown: string;
  };
  seo?: SEO;
  ogMetaData?: OGMetaData;
  preferences?: PostPreferences;
  features?: PostFeatures;
}
```

---

## Search Functions

### `searchPosts(query, limit?)`

Performs full-text search across blog posts.

**Parameters:**
- `query: string` - Search keyword or phrase
- `limit?: number` - Number of results (default: 10, max: 20)

**Returns:** `Promise<BlogPost[]>`

```typescript
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

// Search for posts about TypeScript
const results = await searchPosts('TypeScript', 10);

results.forEach(post => {
  console.log(`${post.title} - ${post.url}`);
});
```

---

## Series Functions

### `getSeriesList(limit?)`

Fetches all series in the publication.

**Parameters:**
- `limit?: number` - Number of series to fetch (default: 10, max: 20)

**Returns:** `Promise<Series[]>`

```typescript
import { getSeriesList } from '@jowinjohnchemban/hashnode-client';

const series = await getSeriesList(10);

series.forEach(s => {
  console.log(s.name);
  console.log(s.slug);
  console.log(s.sortOrder); // "ASCENDING" or "DESCENDING"
});
```

**Response Type:**
```typescript
interface Series {
  id: string;
  name: string;
  slug: string;
  description?: { html: string };
  coverImage?: string;
  sortOrder: 'ASCENDING' | 'DESCENDING';
  createdAt: string;
  author: Author;
}
```

---

### `getSeries(slug)`

Fetches detailed information about a specific series.

**Parameters:**
- `slug: string` - The series slug

**Returns:** `Promise<Series | null>`

```typescript
import { getSeries } from '@jowinjohnchemban/hashnode-client';

const series = await getSeries('my-series-slug');

if (series) {
  console.log(series.name);
  console.log(series.description?.html);
}
```

---

### `getSeriesPosts(seriesSlug, limit?)`

Fetches all posts within a series.

**Parameters:**
- `seriesSlug: string` - The series slug
- `limit?: number` - Number of posts (default: 20, max: 100)

**Returns:** `Promise<BlogPost[]>`

```typescript
import { getSeriesPosts } from '@jowinjohnchemban/hashnode-client';

const posts = await getSeriesPosts('my-series-slug', 50);

posts.forEach((post, index) => {
  console.log(`Part ${index + 1}: ${post.title}`);
});
```

---

## Static Pages

### `getStaticPages(limit?)`

Fetches all static pages (About, Contact, etc.).

**Parameters:**
- `limit?: number` - Number of pages (default: 10, max: 20)

**Returns:** `Promise<StaticPage[]>`

```typescript
import { getStaticPages } from '@jowinjohnchemban/hashnode-client';

const pages = await getStaticPages();

pages.forEach(page => {
  console.log(`${page.title} - /${page.slug}`);
  console.log(`Hidden: ${page.hidden}`);
});
```

**Response Type:**
```typescript
interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: {
    html: string;
    markdown: string;
  };
  hidden: boolean;
  ogMetaData?: OGMetaData;
  seo?: SEO;
}
```

---

### `getStaticPage(slug)`

Fetches a single static page with full content.

**Parameters:**
- `slug: string` - The page slug

**Returns:** `Promise<StaticPage | null>`

```typescript
import { getStaticPage } from '@jowinjohnchemban/hashnode-client';

const aboutPage = await getStaticPage('about');

if (aboutPage) {
  console.log(aboutPage.title);
  console.log(aboutPage.content.html);
}
```

---

## Comments & Discussion

### `getPostComments(postId, limit?)`

Fetches comments for a specific post.

**Parameters:**
- `postId: string` - The post ID
- `limit?: number` - Number of comments (default: 20, max: 50)

**Returns:** `Promise<Comment[]>`

```typescript
import { getPostComments } from '@jowinjohnchemban/hashnode-client';

const comments = await getPostComments('post-id-here', 10);

comments.forEach(comment => {
  console.log(`${comment.author.name}: ${comment.content.text}`);
  console.log(`Reactions: ${comment.totalReactions}`);
  
  // Check for replies
  if (comment.replies.length > 0) {
    console.log(`  ${comment.replies.length} replies`);
  }
});
```

**Response Type:**
```typescript
interface Comment {
  id: string;
  content: {
    text: string;
  };
  author: Author;
  dateAdded: string;
  totalReactions: number;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: {
    text: string;
  };
  author: Author;
  dateAdded: string;
}
```

---

## Recommendations

### `getRecommendedPublications()`

Fetches publications recommended by this blog.

**Returns:** `Promise<Publication[]>`

```typescript
import { getRecommendedPublications } from '@jowinjohnchemban/hashnode-client';

const recommended = await getRecommendedPublications();

recommended.forEach(pub => {
  console.log(pub.title);
  console.log(pub.url);
});
```

---

## Draft Management

### `getDrafts(limit?)`

Fetches draft posts. **Requires authentication** via Personal Access Token.

**Parameters:**
- `limit?: number` - Number of drafts (default: 10, max: 20)

**Returns:** `Promise<Draft[]>`

**Environment Setup:**
```bash
HASHNODE_ACCESS_TOKEN=your-personal-access-token
```

```typescript
import { getDrafts } from '@jowinjohnchemban/hashnode-client';

// Requires HASHNODE_ACCESS_TOKEN environment variable
const drafts = await getDrafts(10);

drafts.forEach(draft => {
  console.log(draft.title);
  console.log(`Last updated: ${draft.updatedAt}`);
  console.log(`Scheduled: ${draft.scheduledDate || 'Not scheduled'}`);
});
```

**Response Type:**
```typescript
interface Draft {
  id: string;
  title: string;
  slug?: string;
  coverImage?: CoverImage;
  updatedAt: string;
  readTimeInMinutes: number;
  tags?: Tag[];
  author: Author;
  scheduledDate?: string;
}
```

---

## Webhook Utilities

### `verifyWebhookSignature(payload, signature, secret)`

Verifies HMAC-SHA256 webhook signature for security.

**Parameters:**
- `payload: string` - Raw request body
- `signature: string` - x-hashnode-signature header value
- `secret: string` - Your webhook secret

**Returns:** `boolean`

```typescript
import { verifyWebhookSignature } from '@jowinjohnchemban/hashnode-client';

const payload = await request.text();
const signature = request.headers.get('x-hashnode-signature') || '';
const secret = process.env.HASHNODE_WEBHOOK_SECRET!;

const isValid = verifyWebhookSignature(payload, signature, secret);

if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}
```

---

### `parseWebhookPayload(payload)`

Parses and validates webhook payload.

**Parameters:**
- `payload: string` - Raw JSON string

**Returns:** `WebhookPayload`

**Throws:** `Error` if payload is invalid

```typescript
import { parseWebhookPayload } from '@jowinjohnchemban/hashnode-client';

const payload = await request.text();
const webhook = parseWebhookPayload(payload);

console.log(webhook.event); // "POST_PUBLISHED", etc.
console.log(webhook.data.post?.title);
```

**Payload Type:**
```typescript
interface WebhookPayload {
  event: WebhookEvent;
  data: {
    post?: {
      id: string;
      title: string;
      slug: string;
      url: string;
      author: Author;
      publishedAt: string;
    };
    staticPage?: {
      id: string;
      title: string;
      slug: string;
      url: string;
    };
  };
}

type WebhookEvent = 
  | 'POST_PUBLISHED'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'STATIC_PAGE_PUBLISHED'
  | 'STATIC_PAGE_UPDATED'
  | 'STATIC_PAGE_DELETED';
```

---

### `processWebhook(payload, handlers)`

Processes webhook with type-safe event handlers.

**Parameters:**
- `payload: WebhookPayload` - Parsed webhook payload
- `handlers: WebhookHandlers` - Event handler functions

**Returns:** `Promise<void>`

```typescript
import { processWebhook, type WebhookHandlers } from '@jowinjohnchemban/hashnode-client';

const handlers: WebhookHandlers = {
  POST_PUBLISHED: async (data) => {
    console.log('New post:', data.data.post?.title);
    // Your logic here (revalidate cache, send notification, etc.)
  },
  POST_UPDATED: async (data) => {
    console.log('Post updated:', data.data.post?.title);
  },
  POST_DELETED: async (data) => {
    console.log('Post deleted:', data.data.post?.id);
  },
};

await processWebhook(webhookPayload, handlers);
```

---

### `isPostEvent(event)` / `isStaticPageEvent(event)`

Type guard functions for webhook events.

```typescript
import { isPostEvent, isStaticPageEvent } from '@jowinjohnchemban/hashnode-client';

if (isPostEvent(webhook.event)) {
  console.log('Post event:', webhook.data.post);
}

if (isStaticPageEvent(webhook.event)) {
  console.log('Static page event:', webhook.data.staticPage);
}
```

---

### `generateWebhookSignature(payload, secret)`

Generates HMAC-SHA256 signature for testing webhooks.

**Parameters:**
- `payload: string` - Webhook payload
- `secret: string` - Webhook secret

**Returns:** `string`

```typescript
import { generateWebhookSignature } from '@jowinjohnchemban/hashnode-client';

const signature = generateWebhookSignature(
  JSON.stringify(webhookData),
  'your-secret'
);
```

---

## Direct Service Access

For advanced use cases, you can access the service singleton directly.

### `hashnodeService`

The underlying service instance with all methods. Service methods **throw errors** instead of returning safe defaults.

```typescript
import { hashnodeService } from '@jowinjohnchemban/hashnode-client';

try {
  const posts = await hashnodeService.getBlogPosts(10);
  const post = await hashnodeService.getBlogPostBySlug('my-slug');
} catch (error) {
  console.error('Service error:', error);
  // Handle error
}
```

**Use Cases:**
- Custom error handling
- Direct GraphQL access
- Building custom wrappers
- Advanced error recovery

---

## Type Exports

All TypeScript types are available for import:

```typescript
import type {
  BlogPost,
  BlogPostDetail,
  Publication,
  Series,
  StaticPage,
  Comment,
  Reply,
  Draft,
  Webhook,
  WebhookPayload,
  WebhookEvent,
  Author,
  Tag,
  CoverImage,
  PageInfo,
} from '@jowinjohnchemban/hashnode-client';
```

---

## Error Handling

### Facade Functions (Recommended)

All top-level functions return safe defaults and never throw:

```typescript
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

// Returns [] on error
const posts = await getBlogPosts(10);

// Returns null on error
const post = await getBlogPostBySlug('invalid-slug');
```

### Service Methods (Advanced)

Direct service access throws errors:

```typescript
import { hashnodeService } from '@jowinjohnchemban/hashnode-client';

try {
  const post = await hashnodeService.getBlogPostBySlug('invalid-slug');
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

---

## Rate Limits

Hashnode API rate limits (as of 2024):
- **Query operations**: 20,000 requests per minute
- **Mutation operations**: 20 requests per minute

This client uses server-side caching (5 minutes) by default to minimize API calls.

---

## Configuration

### Environment Variables

```bash
# Required: Your publication host
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev

# Optional: For draft and webhook operations
HASHNODE_ACCESS_TOKEN=your-personal-access-token
HASHNODE_WEBHOOK_SECRET=your-webhook-secret
```

### Custom Configuration

```typescript
import { HASHNODE_CONFIG } from '@jowinjohnchemban/hashnode-client/config';

console.log(HASHNODE_CONFIG.API_URL);
console.log(HASHNODE_CONFIG.PUBLICATION_HOST);
console.log(HASHNODE_CONFIG.TIMEOUT_MS);
console.log(HASHNODE_CONFIG.MAX_POSTS_PER_REQUEST);
```

---

## Next.js Integration

### Server Components (Recommended)

```typescript
// app/blog/page.tsx
import { getBlogPosts } from '@jowinjohnchemban/hashnode-client';

export default async function BlogPage() {
  const posts = await getBlogPosts(10);
  return <PostList posts={posts} />;
}
```

### API Routes

```typescript
// app/api/search/route.ts
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  const results = await searchPosts(query, 20);
  return Response.json(results);
}
```

### Static Generation

```typescript
// app/blog/[slug]/page.tsx
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

export async function generateStaticParams() {
  const posts = await getBlogPosts(100);
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);
  return <PostContent post={post} />;
}
```

---

## Support

- **Documentation**: [README.md](../README.md)
- **Examples**: [examples/](../examples/)
- **Features**: [FEATURES.md](./FEATURES.md)
- **GitHub**: [Issues & PRs](https://github.com/yourusername/hashnode-client)

---

## License

MIT License - See [LICENSE](../LICENSE) for details
