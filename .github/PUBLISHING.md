# Publishing Guide

Complete guide for publishing new versions of `@jowinjohnchemban/hashnode-client` to npm.

## Prerequisites

### 1. npm Account Setup

1. Create account at [npmjs.com](https://www.npmjs.com/signup)
2. Verify email address
3. Enable 2FA (required for publishing)

### 2. Generate npm Access Token

1. Go to [npm Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. Click "Generate New Token"
3. Select "Automation" token type
4. Copy the token (you won't see it again!)

### 3. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add secret:
   - **Name**: `NPM_TOKEN`
   - **Value**: Your npm access token from step 2

### 4. Configure GitHub Variables (Optional)

For testing examples in CI:
1. Go to Settings → Secrets and variables → Actions → Variables tab
2. Add variable:
   - **Name**: `HASHNODE_PUBLICATION_HOST`
   - **Value**: `yourblog.hashnode.dev`

---

## Publishing Workflow

### Method 1: Fully Automated (Recommended)

**Uses Conventional Commits** for automatic versioning and publishing.

#### Setup Once:
Just commit using [Conventional Commits](./CONVENTIONAL_COMMITS.md) format.

#### How it Works:
Every push to `main` branch automatically:
1. ✅ Analyzes your commit messages
2. ✅ Determines version bump (major/minor/patch)
3. ✅ Updates package.json
4. ✅ Creates git tag
5. ✅ Publishes to npm
6. ✅ Creates GitHub release with changelog

#### Commit Examples:
```bash
# Feature (minor version bump: 2.0.0 → 2.1.0)
git commit -m "feat: add draft management"

# Bug fix (patch version bump: 2.0.0 → 2.0.1)
git commit -m "fix: handle null responses"

# Breaking change (major version bump: 2.0.0 → 3.0.0)
git commit -m "feat!: redesign webhook API"

# No version bump
git commit -m "docs: update README"
```

See [Conventional Commits Guide](./CONVENTIONAL_COMMITS.md) for complete documentation.

---

### Method 2: Manual Versioning

The GitHub Actions workflow automatically publishes when you push a version tag.

#### Step 1: Update Version

```bash
# For patch release (2.0.0 → 2.0.1)
npm version patch

# For minor release (2.0.0 → 2.1.0)
npm version minor

# For major release (2.0.0 → 3.0.0)
npm version major

# Or set specific version
npm version 2.1.0
```

This command:
- Updates `package.json` and `package-lock.json`
- Creates a git commit with message "2.1.0"
- Creates a git tag `v2.1.0`

#### Step 2: Push Changes

```bash
# Push commits and tags
git push && git push --tags
```

#### Step 3: Monitor GitHub Actions

1. Go to your repository's Actions tab
2. Watch the "Publish to npm" workflow
3. It will:
   - ✅ Build TypeScript
   - ✅ Verify version matches
   - ✅ Test module loading
   - ✅ Publish to npm
   - ✅ Create GitHub release

#### Step 4: Verify Publication

```bash
# Check npm registry
npm view @jowinjohnchemban/hashnode-client

# Install and test
npm install @jowinjohnchemban/hashnode-client@latest
```

---

### Manual Publishing (Fallback)

If GitHub Actions fails, you can publish manually:

```bash
# 1. Build the package
npm run clean
npm run build

# 2. Verify build
ls -la *.js *.d.ts

# 3. Test locally
node -e "const c = require('./index.js'); console.log(c);"

# 4. Login to npm (if not already)
npm login

# 5. Publish
npm publish --access public

# 6. Create GitHub release manually
# Go to GitHub → Releases → Draft a new release
```

---

## Pre-Release Checklist

Before publishing a new version:

- [ ] All CI checks passing
- [ ] Version number updated in `package.json`
- [ ] Documentation updated:
  - [ ] `README.md` reflects new features
  - [ ] `docs/FEATURES.md` includes new features
  - [ ] `docs/API_REFERENCE.md` updated if API changed
  - [ ] `docs/MIGRATION.md` updated if breaking changes
- [ ] Examples tested and working
- [ ] Build successful: `npm run build`
- [ ] No uncommitted changes: `git status`
- [ ] Tests passing (if you add tests in future)

---

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

### MAJOR version (X.0.0)
Breaking changes that require user code updates:
- Removing public APIs
- Changing function signatures
- Renaming exports
- Changing default behavior

**Example**: Removing `getBlogPosts()` function

### MINOR version (0.X.0)
New features that are backward compatible:
- Adding new functions
- Adding optional parameters
- Adding new exports
- New documentation

**Example**: Adding `getDrafts()` function

### PATCH version (0.0.X)
Bug fixes and minor improvements:
- Fixing bugs
- Performance improvements
- Documentation fixes
- Dependency updates

**Example**: Fixing webhook signature verification bug

---

## Release Types

### Stable Release

```bash
npm version 2.1.0
git push && git push --tags
```

### Pre-Release (Beta)

```bash
npm version 2.1.0-beta.1
npm publish --tag beta
git push && git push --tags
```

Install with:
```bash
npm install @jowinjohnchemban/hashnode-client@beta
```

### Pre-Release (Alpha)

```bash
npm version 2.1.0-alpha.1
npm publish --tag alpha
git push && git push --tags
```

---

## Workflow Files

### `.github/workflows/publish.yml`
**Trigger**: Push version tags (`v*.*.*`)
**Purpose**: Automated publishing to npm
**Steps**:
1. Checkout code
2. Setup Node.js with npm registry
3. Install dependencies
4. Build TypeScript
5. Verify artifacts
6. Check version match
7. Test module loading
8. Publish to npm with provenance
9. Create GitHub release

### `.github/workflows/ci.yml`
**Trigger**: Push/PR to main/develop
**Purpose**: Continuous integration testing
**Steps**:
1. Build on multiple OS (Ubuntu, Windows, macOS)
2. Test on Node.js 18, 20, 22
3. Verify build artifacts
4. Test module loading
5. Check TypeScript types
6. Lint package.json
7. Security audit

### `.github/workflows/release-draft.yml`
**Trigger**: Manual workflow dispatch
**Purpose**: Create draft release with changelog
**Steps**:
1. Generate changelog from commits
2. Create draft GitHub release
3. Provide next steps instructions

### `.github/workflows/test-examples.yml`
**Trigger**: Changes to examples or source files
**Purpose**: Verify examples work correctly
**Steps**:
1. Build package
2. Verify examples compile
3. Run examples (if env vars set)

---

## Troubleshooting

### Error: "401 Unauthorized"

**Cause**: Invalid or expired npm token

**Fix**:
1. Generate new npm token
2. Update `NPM_TOKEN` secret in GitHub
3. Retry workflow

### Error: "Version already exists"

**Cause**: Trying to publish a version that's already on npm

**Fix**:
1. Bump version: `npm version patch`
2. Push new tag: `git push && git push --tags`

### Error: "Build failed"

**Cause**: TypeScript compilation errors

**Fix**:
1. Run `npm run build` locally
2. Fix TypeScript errors
3. Commit and push fixes
4. Retry workflow

### Error: "Module not found"

**Cause**: Missing files in npm package

**Fix**:
1. Check `.npmignore` isn't excluding needed files
2. Verify `package.json` `files` array includes all needed files
3. Test locally: `npm pack` then extract and check contents

### Workflow doesn't trigger

**Cause**: Tag format doesn't match or missing permissions

**Fix**:
1. Ensure tag starts with `v` (e.g., `v2.0.0` not `2.0.0`)
2. Check repository has Actions enabled
3. Verify workflow file syntax is correct

---

## Post-Publish Tasks

After successful publication:

1. **Test Installation**
   ```bash
   mkdir test-install
   cd test-install
   npm init -y
   npm install @jowinjohnchemban/hashnode-client
   node -e "const c = require('@jowinjohnchemban/hashnode-client'); console.log(c);"
   ```

2. **Update Documentation**
   - Ensure README.md has correct version badges
   - Update any version references

3. **Announce Release**
   - Twitter/X
   - Dev.to
   - Reddit (r/node, r/javascript)
   - Hashnode blog post

4. **Monitor Issues**
   - Watch GitHub issues for problems
   - Check npm download stats
   - Review feedback

---

## npm Package Stats

View package statistics:
- **npm**: https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client
- **npm trends**: https://npmtrends.com/@jowinjohnchemban/hashnode-client
- **Bundlephobia**: https://bundlephobia.com/package/@jowinjohnchemban/hashnode-client

---

## Best Practices

1. **Always test locally first**
   ```bash
   npm run clean && npm run build
   node -e "require('./index.js')"
   ```

2. **Use semantic versioning correctly**
   - Breaking change = major
   - New feature = minor
   - Bug fix = patch

3. **Keep changelog updated**
   - Document all changes in `docs/FEATURES.md`
   - Include migration notes for breaking changes

4. **Test in Next.js project**
   - Create test Next.js app
   - Install from local: `npm install ../path/to/hashnode`
   - Verify server components work
   - Test API routes

5. **Check package size**
   ```bash
   npm pack
   ls -lh *.tgz
   ```
   Package should be < 100 KB

6. **Verify provenance**
   - npm now supports build provenance
   - Automatically enabled in publish workflow
   - Verify at: https://www.npmjs.com/package/@jowinjohnchemban/hashnode-client

---

## Emergency Unpublish

If you accidentally publish a bad version:

```bash
# Unpublish within 72 hours (after that, it's permanent)
npm unpublish @jowinjohnchemban/hashnode-client@2.1.0

# Or deprecate to warn users
npm deprecate @jowinjohnchemban/hashnode-client@2.1.0 "This version has bugs, use 2.1.1 instead"
```

**Warning**: Unpublishing is discouraged. Prefer publishing a patch fix.

---

## Support

- **GitHub Issues**: https://github.com/jowinjohnchemban/hashnode-client/issues
- **npm Support**: https://www.npmjs.com/support
- **Email**: your.email@example.com

---

## Quick Reference

```bash
# Bump version and create tag
npm version patch|minor|major

# Push with tags
git push && git push --tags

# Watch GitHub Actions
# → Go to GitHub repository → Actions tab

# Verify publication
npm view @jowinjohnchemban/hashnode-client

# Test installation
npm install @jowinjohnchemban/hashnode-client@latest
```

---

**Last Updated**: January 6, 2026
