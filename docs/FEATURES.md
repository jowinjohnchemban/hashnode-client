# Hashnode Client Feature Summary

## Overview
Complete TypeScript client for the Hashnode GraphQL API with comprehensive feature coverage including webhooks, search, series management, static pages, comments, and draft handling.

## Version 2.0.0 Release

### New Features

#### 🎯 Search
- **`searchPosts(query, limit)`** - Full-text search across publication posts
- Keyword-based search with pagination support
- Returns matching posts with relevance sorting

#### 📚 Series Management
- **`getSeriesList(limit)`** - List all series in publication
- **`getSeries(slug)`** - Fetch single series by slug
- **`getSeriesPosts(seriesSlug, limit)`** - Get all posts within a series
- Support for ascending/descending post order
- Series metadata including cover images and descriptions

#### 📄 Static Pages
- **`getStaticPages(limit)`** - Fetch all static pages (About, Contact, etc.)
- **`getStaticPage(slug)`** - Get single static page with full content
- SEO metadata support (title, description, OG image)
- Visibility controls (hidden/public pages)

#### 💬 Comments & Discussions
- **`getPostComments(postId, limit)`** - Fetch comments for any post
- Comment author information
- Reaction counts (hearts/likes)
- Support for comment replies
- Pagination for large discussion threads

#### 🔗 Recommendations
- **`getRecommendedPublications()`** - Get publications this blog recommends
- Follower gain metrics
- Cross-promotion support

#### 📝 Draft Management
- **`getDrafts(limit)`** - Fetch draft posts (requires authentication)
- Draft metadata (title, tags, cover image)
- Last updated timestamps
- Support for scheduled drafts

#### 🪝 Webhooks (NEW)
Complete webhook integration system:
- **Signature Verification**: HMAC-SHA256 validation using `crypto.timingSafeEqual()`
- **Payload Parsing**: Type-safe webhook payload parsing
- **Event Handlers**: Type-safe event handler registration system
- **Event Types Support**:
  - `POST_PUBLISHED` - New post published
  - `POST_UPDATED` - Post updated
  - `POST_DELETED` - Post deleted
  - `STATIC_PAGE_PUBLISHED` - New static page
  - `STATIC_PAGE_UPDATED` - Static page updated
  - `STATIC_PAGE_DELETED` - Static page deleted

#### Helper Utilities
- **`isPostEvent(event)`** - Check if webhook is post-related
- **`isStaticPageEvent(event)`** - Check if webhook is page-related
- **`generateWebhookSignature()`** - Generate signatures for testing
- **`processWebhook()`** - Process webhooks with handler registry

### Existing Features (Enhanced)

#### Blog Posts
- Fetch multiple posts with pagination
- Single post fetch with full content (HTML/Markdown)
- Author information and co-authors
- Tags and categories
- Cover images and metadata
- Read time estimation

#### Publication
- Publication metadata for SEO
- Author information
- Social links
- Favicon and branding
- About/description content

### Technical Improvements

#### Type System
Comprehensive TypeScript types for:
- `Webhook`, `WebhookPayload`, `WebhookEvent`
- `Series`, `SeriesListResponse`, `SeriesResponse`
- `StaticPage`, `StaticPagesResponse`
- `Comment`, `Reply`, `CommentsResponse`
- `Draft`, `DraftsResponse`
- `RecommendedPublicationEdge`
- `SearchPostsFilter`, `SearchPostsResponse`

#### Query Builders
New GraphQL queries in `queries.ts`:
- `searchPosts()` - Search query builder
- `getSeriesList()` - Series list query
- `getSeries()` - Single series query
- `getSeriesPosts()` - Series posts query
- `getStaticPages()` - Static pages list query
- `getStaticPage()` - Single page query
- `getPostComments()` - Comments query
- `getRecommendedPublications()` - Recommendations query
- `getDrafts()` - Drafts query
- `createWebhook()`, `updateWebhook()`, `deleteWebhook()` - Webhook mutations

#### Service Layer
`HashnodeService` class extended with:
- `searchPosts()` - Search implementation
- `getSeriesList()`, `getSeries()`, `getSeriesPosts()` - Series management
- `getStaticPages()`, `getStaticPage()` - Static pages
- `getPostComments()` - Comments fetching
- `getRecommendedPublications()` - Recommendations
- `getDrafts()` - Draft management

#### Public API
Convenience functions in `index.ts`:
- All service methods exposed as simple async functions
- Consistent error handling (returns `[]` or `null` on error)
- Webhook utilities re-exported for easy access

### Architecture

#### File Structure
```
├── index.ts            # Public API with convenience wrappers
├── service.ts          # Core service class with all methods
├── queries.ts          # GraphQL query builders
├── types.ts            # TypeScript interfaces (150+ types)
├── config.ts           # Configuration constants
├── graphql-client.ts   # Next.js fetch-based HTTP client
├── webhooks.ts         # NEW: Webhook utilities
├── *.js, *.d.ts       # Compiled artifacts
└── README.md          # Documentation
```

### Usage Examples

#### Search
```typescript
const results = await searchPosts('GraphQL API', 10);
console.log(`Found ${results.length} posts`);
```

#### Series
```typescript
const series = await getSeriesList(5);
const posts = await getSeriesPosts('my-series', 20);
```

#### Static Pages
```typescript
const aboutPage = await getStaticPage('about');
console.log(aboutPage.content.html);
```

#### Webhooks
```typescript
// Verify and process webhook
if (verifyWebhookSignature(payload, signature, secret)) {
  const data = parseWebhookPayload(payload);
  await processWebhook(data, {
    POST_PUBLISHED: async (payload) => {
      console.log('New post:', payload.data.post?.title);
      // Revalidate cache, trigger build, etc.
    }
  });
}
```

#### Comments
```typescript
const comments = await getPostComments('post-id', 50);
console.log(`${comments.length} comments found`);
```

### Migration Guide (v1 to v2)

No breaking changes! Version 2.0 is fully backward compatible:
- All existing functions work exactly the same
- New features are additive only
- Import paths remain unchanged
- Type definitions extended, not replaced

Simply update your package.json:
```json
{
  "dependencies": {
    "@jowinjohnchemban/hashnode-client": "^2.0.0"
  }
}
```

### Configuration

#### Environment Variables
```env
# Required
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev

# Optional (for webhooks)
HASHNODE_WEBHOOK_SECRET=your-secret

# Optional (for drafts/mutations)
HASHNODE_API_TOKEN=your-token
```

### Performance

- **Caching**: Next.js fetch with 5-minute server-side cache
- **Pagination**: Cursor-based pagination for efficient data fetching
- **Fragment Reuse**: DRY query building reduces payload size
- **Type Safety**: Full TypeScript support prevents runtime errors

### Testing

Mock at facade level for easy testing:
```typescript
jest.mock('@jowinjohnchemban/hashnode-client', () => ({
  getBlogPosts: jest.fn().mockResolvedValue([/* mock */]),
  searchPosts: jest.fn().mockResolvedValue([/* mock */]),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
}));
```

### Security

- **Webhook Signatures**: Timing-safe HMAC-SHA256 verification
- **Input Validation**: All inputs validated before processing
- **Error Sanitization**: Errors logged but not exposed to clients
- **Safe Defaults**: Functions return safe values, never throw

### Browser vs Server

- **Server-side**: Full feature support with Next.js fetch caching
- **Client-side**: All read operations work (no auth required)
- **Edge Runtime**: Compatible with Vercel Edge Functions
- **Node.js**: Works in Node.js 18+ (native fetch support)

### Future Roadmap

Planned features for future releases:
- [ ] RSS feed generation
- [ ] Advanced analytics integration
- [ ] Multi-publication support
- [ ] GraphQL subscriptions for real-time updates
- [ ] Post mutation support (create/update/delete)
- [ ] Comment moderation features
- [ ] Newsletter subscriber management
- [ ] Advanced search filters (by tag, date range, author)

### Support

- **Documentation**: [README.md](./README.md)
- **API Reference**: Full TypeScript definitions included
- **Examples**: See usage examples in README
- **Issues**: GitHub Issues for bug reports
- **Contributions**: PRs welcome!

### License

MIT License - Free for commercial and personal use

### Credits

Built with ❤️ for the Hashnode community
Powered by Hashnode's GraphQL API
