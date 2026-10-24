# Security policy

## Supported versions

Only the latest major version receives security fixes.

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a vulnerability

Please **do not** open a public issue. Report vulnerabilities privately through [GitHub security advisories](https://github.com/jowinjohnchemban/hashnode-client/security/advisories/new).

Include the affected version, a description of the impact and steps to reproduce. You should get a response within 7 days. Once a fix is released, the advisory is published with credit, unless you prefer to stay anonymous.

## Handling credentials

Treat `HASHNODE_ACCESS_TOKEN` and `HASHNODE_WEBHOOK_SECRET` like passwords. Keep them in environment variables or a secret manager, never in source control or client-side bundles. Always verify webhook signatures before acting on a delivery.
