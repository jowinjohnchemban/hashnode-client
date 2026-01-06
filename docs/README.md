# Documentation Index

Central hub for all Hashnode GraphQL client documentation.

## 📚 Documentation Structure

```
docs/
├── README.md           # This file - documentation index
├── API_REFERENCE.md    # Complete API documentation
├── DEVELOPMENT.md      # Developer guide
├── MIGRATION.md        # Version migration guide
└── FEATURES.md         # Feature list and release notes
```

---

## Quick Links

### For Users

- **[Getting Started](../README.md)** - Installation and basic usage
- **[API Reference](./API_REFERENCE.md)** - Complete function documentation
- **[Feature List](./FEATURES.md)** - All available features
- **[Examples](../examples/)** - Practical code examples

### For Developers

- **[Development Guide](./DEVELOPMENT.md)** - Contributing and development workflow
- **[Migration Guide](./MIGRATION.md)** - Upgrading between versions
- **[Architecture](../.github/copilot-instructions.md)** - System design and patterns

---

## Documentation Overview

### [API Reference](./API_REFERENCE.md)

Complete documentation of all public APIs:
- Core functions (posts, publication)
- Search functionality
- Series management
- Static pages
- Comments & discussion
- Recommendations
- Draft management
- Webhook utilities
- Type exports

**Use when:** You need detailed information about specific functions, parameters, and return types.

---

### [Development Guide](./DEVELOPMENT.md)

Guide for contributors and maintainers:
- Project setup
- Development workflow
- Architecture patterns
- Adding new features
- Testing strategies
- Publishing process

**Use when:** Contributing code, adding features, or understanding the codebase.

---

### [Migration Guide](./MIGRATION.md)

Version upgrade documentation:
- Breaking changes
- New features by version
- Step-by-step migration
- Common scenarios
- Rollback instructions

**Use when:** Upgrading from v1.x to v2.0 or planning future updates.

---

### [Feature List](./FEATURES.md)

Comprehensive feature documentation:
- v2.0.0 release notes
- Complete feature list
- Usage examples
- Technical details
- Security considerations

**Use when:** You want an overview of all capabilities or planning implementation.

---

## Quick Start

### Installation

```bash
npm install @jowinjohnchemban/hashnode-client
```

### Basic Usage

```typescript
import { getBlogPosts, getBlogPostBySlug } from '@jowinjohnchemban/hashnode-client';

// Fetch recent posts
const posts = await getBlogPosts(10);

// Fetch single post
const post = await getBlogPostBySlug('my-post-slug');
```

### Environment Setup

```bash
# .env
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
```

---

## Feature Categories

### 📝 Content Management

- **Posts**: Fetch recent posts, single post by slug
- **Search**: Full-text search across publication
- **Series**: Manage and display post series
- **Static Pages**: About, Contact, and custom pages
- **Drafts**: Access draft posts (requires auth)

[Learn more →](./API_REFERENCE.md#core-functions)

---

### 💬 Community & Engagement

- **Comments**: Fetch and display post discussions
- **Replies**: Nested comment threads
- **Reactions**: Like counts and engagement metrics
- **Recommendations**: Cross-promote publications

[Learn more →](./API_REFERENCE.md#comments--discussion)

---

### 🔗 Integration & Automation

- **Webhooks**: Real-time event notifications
- **Signature Verification**: Secure webhook validation
- **Event Handlers**: Type-safe webhook processing
- **Cache Invalidation**: Automatic content updates

[Learn more →](./API_REFERENCE.md#webhook-utilities)

---

### 🎨 Customization

- **SEO Metadata**: Publication and post SEO
- **Cover Images**: Hero images and thumbnails
- **OG Tags**: Social media sharing
- **Custom Styling**: Theme colors and branding

[Learn more →](./API_REFERENCE.md#core-functions)

---

## Common Use Cases

### Building a Blog Homepage

Fetch all data needed for a homepage in parallel:

```typescript
const [publication, posts, series, recommended] = await Promise.all([
  getPublication(),
  getBlogPosts(10),
  getSeriesList(5),
  getRecommendedPublications()
]);
```

[See full example →](../examples/advanced-usage.ts)

---

### Implementing Search

Add search functionality to your blog:

```typescript
import { searchPosts } from '@jowinjohnchemban/hashnode-client';

const results = await searchPosts(query, 20);
```

[See full example →](../examples/basic-usage.ts)

---

### Webhook Integration

Handle real-time updates from Hashnode:

```typescript
import { verifyWebhookSignature, processWebhook } from '@jowinjohnchemban/hashnode-client';

// Verify signature
if (!verifyWebhookSignature(payload, signature, secret)) {
  return new Response('Invalid signature', { status: 401 });
}

// Process webhook
const webhook = parseWebhookPayload(payload);
await processWebhook(webhook, handlers);
```

[See full example →](../examples/webhook-handler.ts)

---

### Series Navigation

Build a series page with all posts:

```typescript
const [series, posts] = await Promise.all([
  getSeries(seriesSlug),
  getSeriesPosts(seriesSlug, 100)
]);
```

[See full example →](../examples/advanced-usage.ts)

---

## Architecture Overview

### Design Patterns

1. **Facade Pattern**: Simple public API with error handling
2. **Service Singleton**: Centralized business logic
3. **Query Builder**: GraphQL fragment composition
4. **Type Safety**: Full TypeScript coverage

[Learn more →](./DEVELOPMENT.md#architecture-overview)

---

### File Structure

```
├── index.ts            # Public API facade
├── service.ts          # Core business logic
├── queries.ts          # GraphQL query builder
├── types.ts            # TypeScript interfaces
├── config.ts           # Configuration
├── graphql-client.ts   # HTTP client
├── webhooks.ts         # Webhook utilities
└── examples/           # Usage examples
```

[Learn more →](./DEVELOPMENT.md#file-structure)

---

### Data Flow

```
User Request → Facade → Service → GraphQL Client → Hashnode API
                 ↓
            Error Handling
                 ↓
          Safe Defaults ([], null)
```

[Learn more →](./DEVELOPMENT.md#data-flow)

---

## Technology Stack

- **TypeScript 5.0+**: Type-safe development
- **GraphQL**: Hashnode API v2.0
- **Next.js Fetch**: Server-side caching
- **Node.js Crypto**: HMAC-SHA256 signatures
- **CommonJS**: Universal compatibility

---

## Browser & Environment Support

### Supported Environments

- ✅ Next.js 13+ (App Router)
- ✅ Next.js 12+ (Pages Router)
- ✅ Node.js 18+ (native fetch)
- ✅ Vercel Edge Runtime
- ✅ Express.js / Node servers

### Requirements

- Node.js 18+ (for native fetch API)
- TypeScript 5.0+ (for development)
- Next.js 12+ (for optimal caching)

---

## Performance

### Caching Strategy

- **Server-side**: 5-minute cache (`revalidate: 300`)
- **Client-side**: No browser cache (`cache: 'no-store'`)
- **ISR**: Compatible with Next.js Incremental Static Regeneration

### Optimization Tips

1. Use parallel fetching: `Promise.all()`
2. Enable Next.js caching
3. Implement webhook cache invalidation
4. Batch related queries

[Learn more →](./DEVELOPMENT.md#performance-considerations)

---

## Security

### Best Practices

1. **Webhook Signature Verification**: Always verify HMAC signatures
2. **Environment Variables**: Never commit secrets
3. **Rate Limiting**: Respect API limits (20k req/min)
4. **Timing-Safe Comparison**: Use `crypto.timingSafeEqual()`

[Learn more →](./FEATURES.md#security-considerations)

---

## Testing

### Unit Testing

```typescript
jest.mock('@jowinjohnchemban/hashnode-client', () => ({
  getBlogPosts: jest.fn().mockResolvedValue([]),
  searchPosts: jest.fn().mockResolvedValue([]),
}));
```

### Integration Testing

```typescript
const posts = await getBlogPosts(10);
expect(Array.isArray(posts)).toBe(true);
```

### Webhook Testing

Use ngrok or similar tools for local webhook testing.

[Learn more →](./DEVELOPMENT.md#testing)

---

## Troubleshooting

### Common Issues

1. **"Publication not found"** → Check `HASHNODE_PUBLICATION_HOST`
2. **"Invalid signature"** → Use raw body, not parsed JSON
3. **Type errors** → Ensure TypeScript 5.0+
4. **Module not found** → Check package.json exports

[Full troubleshooting guide →](./DEVELOPMENT.md#troubleshooting)

---

## Contributing

We welcome contributions! See our [Development Guide](./DEVELOPMENT.md) for:

- Setting up development environment
- Code style guidelines
- Pull request process
- Testing requirements

---

## Release Notes

### v2.0.0 (Current)

Major release with extensive new features:
- ✨ Search functionality
- ✨ Series management
- ✨ Static pages
- ✨ Comments & discussion
- ✨ Recommendations
- ✨ Draft management
- ✨ Complete webhook system

[Full changelog →](./FEATURES.md)

---

## Support & Community

### Getting Help

- **Documentation**: You're here!
- **Examples**: [examples/](../examples/)
- **GitHub Issues**: Report bugs
- **GitHub Discussions**: Ask questions

### Useful Links

- [npm Package](https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client)
- [GitHub Repository](https://github.com/yourusername/hashnode-client)
- [Hashnode API Docs](https://apidocs.hashnode.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## License

MIT License - See [LICENSE](../LICENSE) for details

---

## Version Information

- **Current Version**: 2.0.0
- **TypeScript**: 5.0+
- **Node.js**: 18+
- **Hashnode API**: v2.0

---

**Last Updated**: January 6, 2026

For the latest documentation, visit the [GitHub repository](https://github.com/yourusername/hashnode-client).
