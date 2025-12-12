# Hashnode API Integration

> **Standalone, Reusable API Adapter** for fetching blog content from Hashnode's GraphQL API.
> 
> ✨ **This folder is a complete, self-contained module** that can be copied to any Next.js or Node.js project!

## 📦 What Makes This Module Standalone?

This module is **completely self-contained** with:
- ✅ **Zero external dependencies** (except `axios`)
- ✅ **Internal HTTP client** (no shared utilities needed)
- ✅ **All types included** (TypeScript ready)
- ✅ **Configuration isolated** (environment-based)
- ✅ **Documented API** (JSDoc + README)

**Use this as an open-source library!** Copy the entire `hashnode/` folder to any project and it will work immediately.

## 📁 Architecture

This module follows a **modular adapter pattern** to encapsulate all Hashnode-specific logic:

```
src/lib/api/hashnode/
├── index.ts            # Public API facade (barrel exports)
├── service.ts          # Core service class (business logic)
├── queries.ts          # GraphQL query builder
├── types.ts            # TypeScript type definitions
├── config.ts           # Configuration constants
├── graphql-client.ts   # Internal GraphQL client (self-contained)
└── README.md           # This file
```

**✨ All dependencies are internal** - no imports from outside this folder!

## 🎯 Purpose

**Adapter/Handler** that:
- ✅ Abstracts Hashnode GraphQL API complexity
- ✅ Provides type-safe TypeScript interfaces
- ✅ Handles error management gracefully
- ✅ Caches responses using Next.js ISR
- ✅ Can be replaced without changing consuming code

## 🔧 Usage

### Basic Usage (Recommended)

```typescript
import { getBlogPosts, getBlogPostBySlug, getPublication } from '@/lib/api/hashnode';

// Fetch blog posts
const posts = await getBlogPosts(10);

// Fetch single post
const post = await getBlogPostBySlug('my-blog-post');

// Fetch publication details
const publication = await getPublication();
```

### Advanced Usage (Direct Service Access)

```typescript
import { hashnodeService } from '@/lib/api/hashnode';

// Use the singleton service directly
const posts = await hashnodeService.getBlogPosts(20);
const adjacentPosts = await hashnodeService.getAdjacentPosts('current-slug');
```

## 🏗️ Module Components

### 1. **`index.ts`** - Public API Facade
- **Role**: Barrel export file exposing public API
- **Pattern**: Facade pattern - simplifies access to module functionality
- **Exports**: Convenience functions + service singleton

### 2. **`service.ts`** - Core Service Class
- **Role**: Handles all Hashnode API interactions
- **Pattern**: Service/Repository pattern
- **Responsibilities**:
  - GraphQL query execution
  - Response transformation
  - Error handling
  - Caching coordination

### 3. **`queries.ts`** - GraphQL Query Builder
- **Role**: Centralized GraphQL query definitions
- **Pattern**: Builder pattern
- **Benefits**: Reusable query fragments, type safety

### 4. **`types.ts`** - Type Definitions
- **Role**: TypeScript interfaces for all API data
- **Pattern**: Interface Segregation Principle
- **Coverage**: Posts, Authors, Tags, Responses, etc.

### 5. **`config.ts`** - Configuration
- **Role**: Centralized configuration constants
- **Pattern**: Configuration object pattern
- **Settings**: API URLs, timeouts, defaults

### 6. **`graphql-client.ts`** - Internal GraphQL Client
- **Role**: Network layer for GraphQL queries
- **Pattern**: Adapter pattern wrapping axios
- **Benefits**: Makes module self-contained and portable
- **Error Handling**: Custom GraphQLError class

## 🔄 Data Flow

```
Page/Component (RSC)
       ↓
  getBlogPosts()    ← Convenience function (index.ts)
       ↓
HashnodeService     ← Business logic (service.ts)
       ↓
  GraphQL Query     ← Query builder (queries.ts)
       ↓
  GraphQL Client    ← Internal network layer (graphql-client.ts) ✨
       ↓
Hashnode GraphQL API
```

**Note**: The GraphQL client is **internal to this module**, making it fully portable!

## 🛡️ Error Handling

All public functions return safe defaults on error:
- `getBlogPosts()` → `[]` (empty array)
- `getBlogPostBySlug()` → `null`
- `getPublication()` → `null`

Errors are caught and logged internally. No exceptions leak to consuming code.

## ⚡ Performance

- **ISR Caching**: Next.js revalidates data every hour (`revalidate: 3600`)
- **Timeout**: 15s GraphQL request timeout
- **Pagination**: Cursor-based pagination support
- **Optimized Queries**: Only fetches required fields

## 🔌 Replacing the Adapter

To switch from Hashnode to another blogging platform:

1. **Keep the same exports** in `index.ts`
2. **Replace internal implementation** in `service.ts`
3. **Update types** as needed
4. **Consuming code remains unchanged** ✨

Example:
```typescript
// Before: Hashnode
import { getBlogPosts } from '@/lib/api/hashnode';

// After: WordPress (same API)
import { getBlogPosts } from '@/lib/api/wordpress';
```

## 🚀 Using as an Open-Source Library

### Option 1: Copy to Another Project

```bash
# Copy the entire folder
cp -r src/lib/api/hashnode your-project/lib/api/hashnode

# Install the only dependency
npm install axios
```

### Option 2: Publish as npm Package

```bash
# Add package.json in hashnode/
{
  "name": "@yourorg/hashnode-client",
  "version": "1.0.0",
  "main": "index.ts",
  "dependencies": {
    "axios": "^1.13.2"
  }
}

# Publish
npm publish
```

### Option 3: Use as Git Submodule

```bash
git submodule add <your-repo-url> lib/api/hashnode
```

## 📝 Environment Variables

Required:
```env
NEXT_PUBLIC_HASHNODE_PUBLICATION_HOST="yourblog.hashnode.dev"
```

## 🧪 Testing

```typescript
// Mock the service for testing
jest.mock('@/lib/api/hashnode', () => ({
  getBlogPosts: jest.fn().mockResolvedValue([/* mock posts */]),
  getBlogPostBySlug: jest.fn().mockResolvedValue(/* mock post */),
}));
```

## 📚 API Reference

### `getBlogPosts(count?: number): Promise<BlogPost[]>`
Fetch multiple blog posts.

### `getBlogPostBySlug(slug: string): Promise<BlogPostDetail | null>`
Fetch a single post by slug (includes full content).

### `getPublication(): Promise<Publication | null>`
Fetch publication metadata (for SEO, site info).

### `getAdjacentPosts(slug: string): Promise<AdjacentPosts>`
Get previous/next posts relative to current slug.

## 📦 Dependencies

**Only one external dependency:**
```json
{
  "dependencies": {
    "axios": "^1.13.2"
  }
}
```

Everything else is self-contained within this module!

## 🏛️ Design Principles

- **Single Responsibility**: Each file has one clear purpose
- **Dependency Inversion**: Depends on abstractions (HttpClient)
- **Open/Closed**: Open for extension, closed for modification
- **Interface Segregation**: Minimal, focused interfaces
- **DRY**: Query fragments reused across queries

## 📖 Related Documentation

- [Hashnode GraphQL API Docs](https://apidocs.hashnode.com/)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)

---

## 📦 Installation & Requirements

### Requirements
- Node.js 18+ or 20+
- TypeScript 5.0+ (for TypeScript projects)
- Environment variable: `HASHNODE_PUBLICATION_HOST` (your Hashnode publication domain)

### Manual Installation

Copy the folder to your project:

```bash
# Copy entire hashnode folder to your project
cp -r src/lib/api/hashnode your-project/src/lib/api/

# Install axios dependency
npm install axios
```

Set `HASHNODE_PUBLICATION_HOST` in your `.env.local` and you're ready!

## 🎯 Summary

This module is:
- ✅ **Self-contained** - All dependencies internal (except axios)
- ✅ **Portable** - Copy folder → works immediately
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Documented** - JSDoc + README
- ✅ **Production-ready** - Used in production
- ✅ **Open-source friendly** - Easy to publish/share

**Perfect for:**
- Open-source projects
- Internal libraries
- Starter templates
- Learning resources
- Plugin systems

---

## 📄 License

MIT License - feel free to use this module in your projects!

## 👨‍💻 Author

**Jowin John Chemban**
- GitHub: [@jowinjohnchemban](https://github.com/jowinjohnchemban)

*Built with the help of AI - GitHub Copilot*
