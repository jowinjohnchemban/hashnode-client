# Development Guide

Guide for developers working on or contributing to the Hashnode GraphQL client.

## Table of Contents

- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Publishing](#publishing)
- [Troubleshooting](#troubleshooting)

---

## Project Setup

### Prerequisites

- Node.js 18+ (for native fetch support)
- TypeScript 5.0+
- npm or yarn

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/hashnode-client.git
cd hashnode-client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your HASHNODE_PUBLICATION_HOST

# Build TypeScript
npm run build
```

### Environment Variables

Create `.env` file:
```bash
HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
HASHNODE_ACCESS_TOKEN=your-token-here  # Optional: for drafts
HASHNODE_WEBHOOK_SECRET=your-secret    # Optional: for webhooks
```

---

## Development Workflow

### Build Process

```bash
# Clean previous build artifacts
npm run clean

# Compile TypeScript
npm run build

# Watch mode (not currently configured)
# npm run dev
```

### File Structure

```
Root-level flat structure (no src/ folder):
├── index.ts            # Public API facade
├── service.ts          # Core business logic
├── queries.ts          # GraphQL query builder
├── types.ts            # TypeScript interfaces
├── config.ts           # Configuration constants
├── graphql-client.ts   # Internal HTTP client
├── webhooks.ts         # Webhook utilities
├── *.js, *.d.ts       # Compiled outputs
├── examples/          # Usage examples
├── docs/              # Documentation
└── README.md          # User documentation
```

### TypeScript Configuration

Key settings in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**Important**: 
- Compiles **in place** (not to `dist/`)
- Both `.ts` sources and `.js/.d.ts` outputs are committed to Git
- Uses CommonJS (not ESM)

---

## Architecture Overview

### Design Patterns

#### 1. Facade Pattern

[index.ts](../index.ts) provides convenience functions that wrap the service singleton:

```typescript
// index.ts - Facade
export async function getBlogPosts(limit = 10): Promise<BlogPost[]> {
  try {
    return await hashnodeService.getBlogPosts(limit);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return []; // Safe default, never throw
  }
}
```

#### 2. Service Singleton

[service.ts](../service.ts) contains all business logic:

```typescript
// service.ts - Service
class HashnodeService {
  private async executeQuery<T>(query: string): Promise<T> {
    const response = await GraphQLClient.query<GraphQLResponse<T>>(query);
    return this.validateResponse(response);
  }

  async getBlogPosts(limit: number): Promise<BlogPost[]> {
    const query = HashnodeQueries.getBlogPosts(HASHNODE_CONFIG.PUBLICATION_HOST, limit);
    const data = await this.executeQuery<PublicationPostsResponse>(query);
    return data.publication.posts.edges.map(edge => edge.node);
  }
}
```

#### 3. Query Builder

[queries.ts](../queries.ts) uses fragment composition:

```typescript
// queries.ts - Query Builder
export class HashnodeQueries {
  private static POST_BASE_FIELDS = `
    id
    title
    slug
    url
  `;

  private static POST_EXTENDED_FIELDS = `
    ${this.POST_BASE_FIELDS}
    excerpt: brief
    publishedAt
    updatedAt
  `;

  static getBlogPosts(host: string, limit: number): string {
    return `
      query {
        publication(host: "${host}") {
          posts(first: ${limit}) {
            edges {
              node {
                ${this.POST_EXTENDED_FIELDS}
                author { name username }
              }
            }
          }
        }
      }
    `;
  }
}
```

### Data Flow

```
User Request
    ↓
index.ts (facade - catches errors, returns safe defaults)
    ↓
service.ts (business logic - throws errors)
    ↓
graphql-client.ts (HTTP layer - uses Next.js fetch)
    ↓
Hashnode GraphQL API
```

### Error Handling Strategy

**Facade Functions** (recommended for users):
- Never throw errors
- Return safe defaults (`[]` or `null`)
- Log errors to console

**Service Methods** (advanced users):
- Throw errors for explicit handling
- Provide detailed error messages
- Used when custom error handling is needed

---

## Adding New Features

### Step-by-Step Guide

#### 1. Add Types

Edit [types.ts](../types.ts):

```typescript
export interface NewFeature {
  id: string;
  name: string;
  // ... other fields
}

export interface NewFeatureResponse {
  publication: {
    newFeature: {
      edges: Array<{ node: NewFeature }>;
      pageInfo: PageInfo;
    };
  };
}
```

#### 2. Add Query

Edit [queries.ts](../queries.ts):

```typescript
export class HashnodeQueries {
  // Add field fragment if needed
  private static NEW_FEATURE_FIELDS = `
    id
    name
    description
  `;

  // Add query method
  static getNewFeature(host: string, limit: number): string {
    return `
      query {
        publication(host: "${host}") {
          newFeature(first: ${limit}) {
            edges {
              node {
                ${this.NEW_FEATURE_FIELDS}
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;
  }
}
```

#### 3. Add Service Method

Edit [service.ts](../service.ts):

```typescript
class HashnodeService {
  async getNewFeature(limit: number = 10): Promise<NewFeature[]> {
    const query = HashnodeQueries.getNewFeature(HASHNODE_CONFIG.PUBLICATION_HOST, limit);
    const data = await this.executeQuery<NewFeatureResponse>(query);
    return data.publication.newFeature.edges.map(edge => edge.node);
  }
}
```

#### 4. Add Facade Function

Edit [index.ts](../index.ts):

```typescript
export async function getNewFeature(limit = 10): Promise<NewFeature[]> {
  try {
    return await hashnodeService.getNewFeature(limit);
  } catch (error) {
    console.error('Error fetching new feature:', error);
    return [];
  }
}

// Also export the type
export type { NewFeature } from './types';
```

#### 5. Add Example

Create [examples/new-feature.ts](../examples/):

```typescript
import { getNewFeature } from '../index';

async function demo() {
  const items = await getNewFeature(10);
  console.log(items);
}

demo();
```

#### 6. Update Documentation

Update [docs/API_REFERENCE.md](./API_REFERENCE.md):

```markdown
### `getNewFeature(limit?)`

Description of the new feature.

**Parameters:**
- `limit?: number` - Number of items (default: 10)

**Returns:** `Promise<NewFeature[]>`

**Example:**
\`\`\`typescript
const items = await getNewFeature(10);
\`\`\`
```

#### 7. Build and Test

```bash
npm run build
npx ts-node examples/new-feature.ts
```

---

## Testing

### Manual Testing

Run examples to test functionality:

```bash
# Test basic features
npx ts-node examples/basic-usage.ts

# Test advanced features
npx ts-node examples/advanced-usage.ts

# Test specific feature
npx ts-node -e "
import { getNewFeature } from './index';
getNewFeature(5).then(console.log);
"
```

### Testing Webhooks Locally

1. **Set up ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Configure webhook in Hashnode:**
   - Go to Hashnode dashboard → Settings → Webhooks
   - Add webhook URL: `https://your-url.ngrok.io/api/webhook`
   - Add secret key
   - Select events

3. **Test signature verification:**
   ```typescript
   import { verifyWebhookSignature, generateWebhookSignature } from './webhooks';
   
   const payload = JSON.stringify({ event: 'POST_PUBLISHED', data: {} });
   const secret = 'test-secret';
   const signature = generateWebhookSignature(payload, secret);
   
   console.log(verifyWebhookSignature(payload, signature, secret)); // true
   ```

### Type Checking

```bash
npx tsc --noEmit
```

### Linting (if configured)

```bash
npm run lint
```

---

## Publishing

### Pre-publish Checklist

- [ ] Update version in `package.json`
- [ ] Update changelog/release notes
- [ ] Run `npm run build` successfully
- [ ] Test examples work correctly
- [ ] Update documentation if needed
- [ ] Commit all changes (including compiled `.js/.d.ts` files)
- [ ] Create Git tag

### Publishing to npm

```bash
# Ensure you're logged in
npm whoami

# Run pre-publish checks
npm run prepublishOnly

# Publish
npm publish --access public

# Tag release
git tag v2.0.1
git push origin v2.0.1
```

### Version Bumping

```bash
# Patch (2.0.0 → 2.0.1)
npm version patch

# Minor (2.0.0 → 2.1.0)
npm version minor

# Major (2.0.0 → 3.0.0)
npm version major
```

---

## Troubleshooting

### Issue: TypeScript compilation fails

**Solution**: Check `tsconfig.json` settings:
```json
{
  "compilerOptions": {
    "outDir": "./",
    "rootDir": "./"
  }
}
```

Make sure both are set to `"./"` for in-place compilation.

### Issue: Module not found errors

**Solution**: Check `package.json` exports:
```json
{
  "exports": {
    ".": "./index.js",
    "./types": "./types.js",
    "./config": "./config.js",
    "./source/*": "./*.ts"
  }
}
```

### Issue: GraphQL errors

**Solution**: Test queries directly:
```typescript
import { GraphQLClient } from './graphql-client';
import { HashnodeQueries } from './queries';

const query = HashnodeQueries.getBlogPosts('yourblog.hashnode.dev', 5);
console.log(query); // Inspect generated query

GraphQLClient.query(query).then(console.log);
```

### Issue: Webhook signature fails

**Solution**: Ensure you're using raw body:
```typescript
// ✓ Correct - raw string
const payload = await request.text();

// ✗ Wrong - parsed object
const payload = await request.json();
```

### Issue: "Cannot find module" in Next.js

**Solution**: Add to `next.config.js`:
```javascript
module.exports = {
  transpilePackages: ['@jowinjohnchemban/hashnode-client'],
};
```

### Issue: Windows build errors

**Solution**: Check scripts in `package.json`:
```json
{
  "scripts": {
    "clean": "del /q *.js *.d.ts 2>nul || exit /b 0"
  }
}
```

Use Windows-compatible commands (`del` not `rm`).

---

## GraphQL API Reference

### Official Documentation

- [Hashnode API Docs](https://apidocs.hashnode.com/)
- [GraphQL Playground](https://gql.hashnode.com/)

### Testing Queries

Use the GraphQL Playground to test queries before implementing:

1. Go to https://gql.hashnode.com/
2. Add headers if needed:
   ```json
   {
     "Authorization": "YOUR_TOKEN"
   }
   ```
3. Test your query
4. Copy working query to [queries.ts](../queries.ts)

### Common Query Patterns

**Pagination:**
```graphql
query {
  publication(host: "blog.hashnode.dev") {
    posts(first: 10, after: "cursor") {
      edges {
        node { id title }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

**Filtering:**
```graphql
query {
  searchPostsOfPublication(
    first: 10
    filter: { 
      publicationId: "id"
      query: "keyword"
    }
  ) {
    edges {
      node { id title }
    }
  }
}
```

---

## Code Style Guidelines

### TypeScript

- Use `interface` for data structures, `type` for unions/intersections
- Always export types used in public APIs
- Prefer `async/await` over Promise chains
- Use optional chaining: `post?.author?.name`
- Add JSDoc comments for public functions

### Naming Conventions

- **Files**: kebab-case (e.g., `graphql-client.ts`)
- **Classes**: PascalCase (e.g., `HashnodeService`)
- **Functions**: camelCase (e.g., `getBlogPosts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_URL`)
- **Interfaces**: PascalCase (e.g., `BlogPost`)

### Error Handling

```typescript
// Facade functions - catch and return safe defaults
export async function getItems(): Promise<Item[]> {
  try {
    return await service.getItems();
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Service methods - throw errors
async getItems(): Promise<Item[]> {
  const response = await this.executeQuery<Response>(query);
  if (!response.publication) {
    throw new Error('Publication not found');
  }
  return response.publication.items;
}
```

---

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the guidelines above
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(queries): add support for draft posts
fix(webhooks): correct signature verification
docs(api): update getBlogPosts examples
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Hashnode API Reference](https://apidocs.hashnode.com/)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/hashnode-client/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/hashnode-client/discussions)
- **Email**: your.email@example.com

---

## License

MIT License - See [LICENSE](../LICENSE) for details
