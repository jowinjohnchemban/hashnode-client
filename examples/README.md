# Hashnode Client Examples

This folder contains practical examples demonstrating how to use the Hashnode GraphQL client.

## 📁 Examples Overview

### 1. [basic-usage.ts](./basic-usage.ts)
**Complete beginner-friendly example** covering all basic operations:
- Fetching publication details
- Getting recent blog posts
- Fetching individual posts with full content
- Searching posts by keyword
- Working with series
- Accessing static pages
- Error handling patterns

**Perfect for**: First-time users, quick reference, understanding the API basics

### 2. [webhook-handler.ts](./webhook-handler.ts)
**Production-ready webhook implementation** showing:
- Webhook signature verification (HMAC-SHA256)
- Next.js API route integration
- Express.js server integration
- Event-based processing
- Type-safe webhook handlers
- Security best practices
- Testing and deployment tips

**Perfect for**: Implementing real-time updates, cache invalidation, notifications

### 3. [advanced-usage.ts](./advanced-usage.ts)
**Advanced patterns and optimizations**:
- Direct service access
- Building complex page layouts
- Parallel data fetching
- Cache warming strategies
- Post navigation (prev/next)
- Combining multiple API calls
- Performance optimization

**Perfect for**: Production applications, performance-critical use cases, complex integrations

## 🚀 Running the Examples

### Prerequisites

1. **Set up environment variables**:
   ```bash
   # Copy .env.example to .env
   cp ../.env.example .env
   
   # Edit .env and add your Hashnode publication host
   HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   cd ..
   npm install
   ```

### Running with ts-node

```bash
# Basic usage example
npx ts-node examples/basic-usage.ts

# Advanced usage example
npx ts-node examples/advanced-usage.ts

# Webhook example (just for reference, needs server setup)
npx ts-node examples/webhook-handler.ts
```

### Running with Node.js (compile first)

```bash
# Compile TypeScript
npm run build

# Run compiled examples
node examples/basic-usage.js
node examples/advanced-usage.js
```

## 📝 Example Scenarios

### Scenario 1: Building a Blog Homepage

Combine multiple API calls to build a complete homepage:

```typescript
import { getBlogPosts, getSeriesList, getPublication } from '@jowinjohnchemban/hashnode-client';

async function buildHomepage() {
  const [publication, posts, series] = await Promise.all([
    getPublication(),
    getBlogPosts(10),
    getSeriesList(5),
  ]);

  return { publication, posts, series };
}
```

See [advanced-usage.ts](./advanced-usage.ts) for full implementation.

### Scenario 2: Post Search Page

Implement a search feature:

```typescript
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

async function searchBlog(query: string) {
  const results = await searchPosts(query, 20);
  return results;
}
```

See [basic-usage.ts](./basic-usage.ts) for full implementation.

### Scenario 3: Series Page with All Posts

Build a series page:

```typescript
import { getSeries, getSeriesPosts } from '@jowinjohnchemban/hashnode-client';

async function buildSeriesPage(slug: string) {
  const [series, posts] = await Promise.all([
    getSeries(slug),
    getSeriesPosts(slug, 100),
  ]);

  return { series, posts };
}
```

See [advanced-usage.ts](./advanced-usage.ts) for full implementation.

### Scenario 4: Real-time Updates with Webhooks

Set up webhook to automatically update your cache:

```typescript
// In your Next.js API route
import { verifyWebhookSignature, parseWebhookPayload } from '@jowinjohnchemban/hashnode-client';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('x-hashnode-signature') || '';
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const webhook = parseWebhookPayload(payload);
  
  if (webhook.event === 'POST_PUBLISHED') {
    // Revalidate blog pages
    await revalidatePath('/blog');
    await revalidatePath(`/blog/${webhook.data.post?.slug}`);
  }

  return new Response('OK', { status: 200 });
}
```

See [webhook-handler.ts](./webhook-handler.ts) for full implementation.

## 🔧 Integration Patterns

### Next.js App Router (Recommended)

```typescript
// app/blog/page.tsx
import { getBlogPosts } from '@jowinjohnchemban/hashnode-client';

export default async function BlogPage() {
  const posts = await getBlogPosts(10);
  
  return (
    <div>
      <h1>Blog</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### Next.js Pages Router

```typescript
// pages/blog/[slug].tsx
import { GetStaticProps, GetStaticPaths } from 'next';
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getBlogPosts(100);
  return {
    paths: posts.map(post => ({ params: { slug: post.slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await getBlogPostBySlug(params!.slug as string);
  return {
    props: { post },
    revalidate: 3600, // Revalidate every hour
  };
};
```

### Express.js API

```typescript
import express from 'express';
import { getBlogPosts, searchPosts } from '@jowinjohnchemban/hashnode-client';

const app = express();

app.get('/api/posts', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const posts = await getBlogPosts(limit);
  res.json(posts);
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  const results = await searchPosts(query, 20);
  res.json(results);
});

app.listen(3000);
```

## 🐛 Troubleshooting

### Issue: "Invalid signature" error with webhooks

**Solution**: Make sure you're using the raw request body for signature verification:
```typescript
// Next.js: Use request.text() not request.json()
const payload = await request.text(); // ✓ Correct

// Express: Use express.text() middleware
app.use(express.text({ type: 'application/json' })); // ✓ Correct
```

### Issue: "Publication not found"

**Solution**: Check your environment variable:
```bash
# Make sure this is set correctly
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
```

### Issue: TypeScript errors

**Solution**: Make sure types are imported correctly:
```typescript
import type { BlogPost, BlogPostDetail } from '@jowinjohnchemban/hashnode-client';
```

## 📚 Additional Resources

- [Main README](../README.md) - Complete documentation
- [Feature List](../FEATURES.md) - All available features
- [Type Definitions](../types.ts) - TypeScript types
- [Hashnode API Docs](https://apidocs.hashnode.com/) - Official API documentation

## 💡 Tips

1. **Always use environment variables** for configuration
2. **Enable caching** in production (Next.js handles this automatically)
3. **Handle errors gracefully** - all facade functions return safe defaults
4. **Use parallel fetching** with `Promise.all()` for better performance
5. **Verify webhook signatures** before processing (security critical)
6. **Test webhooks locally** using ngrok or similar tools
7. **Monitor API usage** - respect rate limits (20k req/min for queries)

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue on GitHub!

Want to add more examples? PRs are welcome!

## 📄 License

MIT License - See [LICENSE](../LICENSE) file for details
