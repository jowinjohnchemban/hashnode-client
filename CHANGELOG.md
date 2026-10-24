# Changelog

Release notes for versions after 2.0.0 are published on [GitHub Releases](https://github.com/jowinjohnchemban/hashnode-client/releases).

## [2.0.0](https://github.com/jowinjohnchemban/hashnode-client/compare/v1.0.13...v2.0.0) (2026-10-24)


### ⚠ BREAKING CHANGES

* requires Node.js 22+. HashnodeService, HASHNODE_CONFIG and the ./types, ./config and ./source/* subpath exports are removed; use HashnodeClient. Client list methods return Page<T> and throw HashnodeError. Webhook helpers are async and use Hashnode's lowercase event names. See docs/MIGRATION.md.

### Features

* add service layer, type definitions and webhook utilities ([8dbee49](https://github.com/jowinjohnchemban/hashnode-client/commit/8dbee49f7314c3eb0a90aa84793f02d94ca53ed8))
* rewrite client for Hashnode's current GraphQL API ([#1](https://github.com/jowinjohnchemban/hashnode-client/issues/1)) ([87ee633](https://github.com/jowinjohnchemban/hashnode-client/commit/87ee633caa7c9d3ee14f277b502ec825d4964e05))


### Refactoring

* use Next.js fetch with server-side caching in the GraphQL client ([ff23f4d](https://github.com/jowinjohnchemban/hashnode-client/commit/ff23f4d94fd367747ed8312146ae716ced1991e0))


### Documentation

* restructure README and add guides to docs/ ([#5](https://github.com/jowinjohnchemban/hashnode-client/issues/5)) ([b0733ec](https://github.com/jowinjohnchemban/hashnode-client/commit/b0733ec35b2875a0ff60433dd0bac3a02c44f8af))
