# Contributing

Thanks for helping improve the client! Issues and pull requests are welcome. By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

## Setup

Requires Node.js 22+ (see `.nvmrc`) and [pnpm](https://pnpm.io). The pnpm version is pinned in `package.json`, and `corepack enable` picks it up.

```sh
pnpm install
pnpm check   # format, lint, typecheck, unit tests, build and package validation
```

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm build`            | Bundle `src/` to `dist/` (ESM + CJS + types) with tsdown         |
| `pnpm test`             | Unit tests (no network)                                          |
| `pnpm test:coverage`    | Unit tests with a coverage report                                |
| `pnpm test:integration` | Tests against the live Hashnode API (see [Testing](#testing))    |
| `pnpm lint`             | ESLint (type-aware)                                              |
| `pnpm format`           | Prettier                                                         |
| `pnpm typecheck`        | `tsc --noEmit` over source, tests and examples                   |
| `pnpm lint:package`     | publint, Are The Types Wrong, and a check of the tarball's files |

Use pnpm only. Don't commit `package-lock.json` or `yarn.lock`.

## Project layout

```
src/
  index.ts      Public entry point and convenience functions
  client.ts     HashnodeClient
  transport.ts  fetch, timeouts, error mapping
  queries.ts    GraphQL documents
  types.ts      Public types
  errors.ts     HashnodeError
  config.ts     Options and environment variables
  webhooks.ts   Webhook verification and dispatch
test/
  unit/         Fast tests with a mocked fetch
  integration/  Tests against the live Hashnode API
examples/       Type-checked usage examples
scripts/        Release tooling (package content check)
```

## Testing

There are three layers of tests:

1. **Unit tests** (`pnpm test`) mock `fetch`. They cover every client method's variables and result mapping, error handling, timeouts and aborts, environment configuration, the convenience functions, and webhook signing, parsing and the route handler. They run on every push and PR on Linux, Windows and macOS.

2. **Contract tests** (`pnpm test:integration`, always run) send every query to the real API. Hashnode validates a query before checking the Pro plan, so a valid query against a non-Pro publication fails with `FORBIDDEN`, while a query that no longer matches the schema fails with `GRAPHQL_VALIDATION_FAILED`. These tests need network access but no account, and they catch schema drift and endpoint changes.

3. **Live tests** (`pnpm test:integration`, run only when configured) read real data from a Pro publication and check the shape of every result, pagination, missing-item handling and search:

   ```sh
   HASHNODE_PUBLICATION_HOST=blog.example.com pnpm test:integration
   # also test drafts:
   HASHNODE_PUBLICATION_HOST=blog.example.com HASHNODE_ACCESS_TOKEN=... pnpm test:integration
   ```

   Set `HASHNODE_CONTRACT_HOST` to use a different publication for contract tests, and `HASHNODE_API_URL` to test another endpoint.

The **API integration** workflow runs contract tests daily and on changes to `src/`. To enable live tests in CI, set the repository **variable** `HASHNODE_PUBLICATION_HOST` and, optionally, the **secret** `HASHNODE_ACCESS_TOKEN`. Releases run the integration tests before publishing.

When you add or change a query, add it to `test/integration/contract.test.ts`. The [Hashnode schema](https://github.com/Hashnode/gql-skill) lists the available fields.

## Commits and pull requests

The project uses [Conventional Commits](https://www.conventionalcommits.org/). PRs are squash-merged, so the **PR title** becomes the commit message, and CI checks it:

- `feat: add getTag` creates a minor release
- `fix: handle null cover image` creates a patch release
- `feat!: …` or a `BREAKING CHANGE:` footer creates a major release
- `docs:`, `chore:`, `ci:`, `test:`, `refactor:` and `build:` don't create a release on their own

## Releases

Releases are fully automatic. Merging a `feat:` or `fix:` PR to `main` publishes a new version to npm, with no manual steps:

1. **Release** workflow: [release-please](https://github.com/googleapis/release-please) opens or updates a release PR with the next version and `CHANGELOG.md` entries, based on the commit messages.
2. **CI** runs on the release PR.
3. **Auto-release** workflow: when CI passes, it waits for every required check, squash-merges the release PR and starts the **Release** workflow.
4. **Release** workflow: release-please tags the version and creates a GitHub release. The publish job then runs all checks and the integration tests, verifies the package contents and publishes to npm with provenance.

If any check fails, nothing is merged or published. Fix the problem on `main`, and the release PR is updated and retried. To publish by hand instead, disable the Auto-release workflow and merge release PRs yourself; then run **Release** from the Actions tab if it didn't start.

Only `dist/`, `README.md`, `LICENSE` and `package.json` are published. `scripts/verify-package.mjs` fails the release if anything else ends up in the tarball.

### Publishing setup

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm accepts the GitHub Actions identity token for this repository, the `release.yml` workflow and the `npm` environment, so no npm token is stored in GitHub. Configure it once on npm (requires npm CLI 11.5.1+ and an npm login with publish rights):

```sh
npm login
npx npm@latest trust github @jowinjohnchemban/hashnode-client \
  --repository jowinjohnchemban/hashnode-client --file release.yml --environment npm
```

You can also do this on npmjs.com under **Package → Settings → Trusted publishing**. Afterwards, set **Publishing access** to "Require two-factor authentication and disallow tokens" so the package can only be published from the workflow.

If trusted publishing isn't an option, add an npm granular access token as the `NPM_TOKEN` secret of the `npm` environment instead (`gh secret set NPM_TOKEN --env npm`).

The repository is configured with:

- an `npm` environment that only `main` can deploy to
- **Allow GitHub Actions to create and approve pull requests**, so release-please can open release PRs
- a `main` ruleset that blocks force pushes and deletion, requires a pull request and requires the CI checks to pass

Release PRs are merged by the Auto-release workflow, never by pushing to `main` directly: the branch is protected, so command-line merges are rejected.
