# Conventional Commits Guide

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

## Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

### Version Bump Types

#### 🔴 MAJOR Version (Breaking Changes)
Use `!` after type/scope or `BREAKING CHANGE:` in footer:

```bash
feat!: remove deprecated getBlogPost function
# or
feat: new API endpoint

BREAKING CHANGE: removed getBlogPost, use getBlogPostBySlug instead
```

**Examples**:
- `feat!: change API signature for searchPosts`
- `fix!: remove support for Node.js 16`
- `refactor!: rename hashnodeService to HashnodeService`

**Results in**: `2.0.0` → `3.0.0`

---

#### 🟡 MINOR Version (New Features)
Add new features without breaking existing functionality:

```bash
feat: add support for draft posts
feat(webhooks): add HMAC signature verification
feat(search): implement full-text search
```

**Examples**:
- `feat: add getDrafts function`
- `feat(series): add series management endpoints`
- `feat(types): add WebhookPayload interface`

**Results in**: `2.0.0` → `2.1.0`

---

#### 🟢 PATCH Version (Bug Fixes & Improvements)
Fix bugs or make improvements:

```bash
fix: correct webhook signature validation
perf: optimize GraphQL query caching
refactor: improve error handling in service layer
```

**Examples**:
- `fix: handle null responses in getBlogPosts`
- `fix(webhooks): use timing-safe comparison`
- `perf: reduce bundle size by 20%`
- `refactor: simplify query builder logic`

**Results in**: `2.0.0` → `2.0.1`

---

#### ⚪ NO Version Bump
Documentation, chores, tests, and style changes:

```bash
docs: update API reference
chore: update dependencies
test: add unit tests for webhooks
style: format code with prettier
ci: update GitHub Actions workflow
```

**Examples**:
- `docs: add webhook integration guide`
- `chore: bump typescript to 5.3.0`
- `test: add tests for searchPosts`
- `style: fix linting errors`
- `ci: enable caching in workflows`

**Results in**: No version change

---

## Commit Types Reference

| Type | Description | Version Bump | Example |
|------|-------------|--------------|---------|
| `feat` | New feature | MINOR | `feat: add search functionality` |
| `fix` | Bug fix | PATCH | `fix: handle empty responses` |
| `perf` | Performance improvement | PATCH | `perf: cache GraphQL queries` |
| `refactor` | Code refactoring | PATCH | `refactor: simplify service layer` |
| `revert` | Revert previous commit | PATCH | `revert: undo feature X` |
| `docs` | Documentation only | NONE | `docs: update README` |
| `style` | Code style/formatting | NONE | `style: fix indentation` |
| `test` | Tests only | NONE | `test: add webhook tests` |
| `chore` | Maintenance tasks | NONE | `chore: update deps` |
| `ci` | CI/CD changes | NONE | `ci: add publish workflow` |
| `build` | Build system changes | NONE | `build: update tsconfig` |

---

## Scopes (Optional)

Use scopes to indicate what part of the codebase is affected:

```bash
feat(webhooks): add signature verification
fix(queries): handle pagination correctly
docs(api): update function signatures
chore(deps): update axios to 1.6.0
```

**Common scopes**:
- `webhooks` - Webhook-related changes
- `queries` - GraphQL query changes
- `types` - TypeScript type changes
- `api` - Public API changes
- `service` - Service layer changes
- `deps` - Dependency updates
- `ci` - CI/CD changes

---

## Examples by Scenario

### Adding a New Feature

```bash
# New public function
git commit -m "feat: add getRecommendedPublications function"

# New webhook event support
git commit -m "feat(webhooks): add support for STATIC_PAGE_DELETED event"

# New search filter
git commit -m "feat(search): add date range filtering"
```

### Fixing a Bug

```bash
# Fix incorrect behavior
git commit -m "fix: return empty array instead of throwing on 404"

# Fix type error
git commit -m "fix(types): make PageInfo.endCursor nullable"

# Fix webhook issue
git commit -m "fix(webhooks): use constant-time comparison for signatures"
```

### Breaking Changes

```bash
# Remove deprecated API
git commit -m "feat!: remove deprecated getPost function

BREAKING CHANGE: getPost has been removed. Use getBlogPostBySlug instead."

# Change function signature
git commit -m "fix!: change searchPosts to return Promise<BlogPost[]>

BREAKING CHANGE: searchPosts now returns Promise<BlogPost[]> instead of SearchResult"
```

### Documentation Updates

```bash
# Update README
git commit -m "docs: add webhook integration guide"

# Update API reference
git commit -m "docs(api): clarify searchPosts parameters"

# Add examples
git commit -m "docs: add advanced usage examples"
```

### Maintenance Tasks

```bash
# Update dependencies
git commit -m "chore(deps): update axios to 1.6.5"

# Update build config
git commit -m "chore: update tsconfig for better compatibility"

# Update CI/CD
git commit -m "ci: add automated versioning workflow"
```

---

## Multi-Line Commits

For complex changes, use multi-line commit messages:

```bash
git commit -m "feat: add series management functions

Add three new functions for managing blog series:
- getSeriesList(): Fetch all series
- getSeries(slug): Get single series
- getSeriesPosts(slug): Get posts in series

Also adds Series type and related GraphQL queries."
```

Or with breaking changes:

```bash
git commit -m "feat!: redesign webhook payload structure

BREAKING CHANGE: Webhook payload structure has changed.
The 'data' property now contains nested 'post' or 'staticPage'
objects instead of flat structure.

Migration:
- Old: payload.postId
- New: payload.data.post.id"
```

---

## Using Git Commit Template

Create a commit template to help remember the format:

```bash
# Create template file
cat > ~/.gitmessage << 'EOF'
# <type>[optional scope]: <description>
# |<----  Using a Maximum Of 50 Characters  ---->|

# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Provide links or keys to any relevant tickets, articles or other resources
# Example: Github issue #23

# --- COMMIT END ---
# Type can be:
#    feat     (new feature)
#    fix      (bug fix)
#    refactor (refactoring code)
#    style    (formatting, missing semi colons, etc; no code change)
#    docs     (changes to documentation)
#    test     (adding or refactoring tests; no production code change)
#    chore    (updating build tasks etc; no production code change)
#    perf     (performance improvements)
#    ci       (CI/CD changes)
# --------------------
# Breaking changes:
#    - Add ! after type/scope (e.g., feat!:)
#    - Or add "BREAKING CHANGE:" in footer
# --------------------
# Remember to:
#    - Use imperative mood ("add" not "added" or "adds")
#    - Don't capitalize first letter
#    - No dot (.) at the end
# --------------------
EOF

# Configure git to use template
git config --global commit.template ~/.gitmessage
```

---

## Automated Versioning Workflow

When you push to `main` branch:

1. **Analyzes commits** since last tag
2. **Determines version bump**:
   - Breaking change (`!` or `BREAKING CHANGE:`) → MAJOR
   - Feature (`feat:`) → MINOR
   - Fix/Perf/Refactor (`fix:`, `perf:`, `refactor:`) → PATCH
   - Other (`docs:`, `chore:`, etc.) → No bump
3. **Updates package.json** automatically
4. **Creates git tag** (e.g., `v2.1.0`)
5. **Publishes to npm**
6. **Creates GitHub release** with categorized changelog

---

## Best Practices

### ✅ DO

- Use lowercase for type and description
- Use imperative mood: "add" not "added"
- Keep description under 50 characters
- Add body for complex changes
- Reference issues: `Fixes #123`
- Group related changes in one commit

### ❌ DON'T

- Don't capitalize description
- Don't end with period
- Don't mix multiple types in one commit
- Don't use vague messages like "fix stuff"
- Don't commit broken code

---

## Examples from Real Commits

### Good Examples ✅

```bash
feat: add search functionality for blog posts
fix(webhooks): validate signature before parsing
docs: add migration guide for v2.0
chore(deps): update typescript to 5.3
refactor: extract query builder logic
perf: cache GraphQL responses for 5 minutes
test: add unit tests for webhook handlers
```

### Bad Examples ❌

```bash
Added new feature           # Missing type
Fix bug.                    # Ends with period, vague
update docs                 # Missing type, not imperative
FEAT: New Search            # Capitalized
fix: fixed bug in code      # Redundant "fixed"
Updated multiple things     # Vague, no type
```

---

## Quick Reference

```bash
# Feature
git commit -m "feat: add draft management"

# Bug fix
git commit -m "fix: handle null values"

# Breaking change
git commit -m "feat!: redesign API"

# Documentation
git commit -m "docs: update examples"

# Chore
git commit -m "chore: update dependencies"

# Performance
git commit -m "perf: optimize queries"

# Refactor
git commit -m "refactor: simplify code"
```

---

## Verification

Check your commit messages follow conventions:

```bash
# View recent commits
git log --oneline -10

# Check if message follows format
git log --oneline -1 | grep -E "^[a-z]+(\(.+\))?!?: .+"
```

---

## Tools & IDE Integration

### VS Code
- Install "Conventional Commits" extension
- Provides commit message helper in Source Control panel

### Git Hook (Optional)
Validate commit messages automatically:

```bash
# Create commit-msg hook
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/sh
commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?!?: .+"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo "❌ Invalid commit message format!"
  echo "Use: <type>[scope]: <description>"
  echo "Example: feat: add new feature"
  exit 1
fi
EOF

chmod +x .git/hooks/commit-msg
```

---

## Learn More

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)

---

**Note**: The automated versioning workflow runs on every push to `main`. Make sure all commits follow the convention before merging PRs!
