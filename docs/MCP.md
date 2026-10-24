# MCP server

The package includes a [Model Context Protocol](https://modelcontextprotocol.io) server. It gives AI assistants such as Claude, ChatGPT, Cursor and VS Code Copilot read-only access to a Hashnode publication: they can search posts, read them, and browse series, static pages and comments.

The server runs locally over stdio with `npx` and needs no extra dependencies. Like the client, it needs a publication on a Hashnode **Pro plan**.

## Set up

Every client starts the same command:

```sh
npx -y @jowinjohnchemban/hashnode-client --host blog.example.com
```

`--host` can be replaced by the `HASHNODE_PUBLICATION_HOST` environment variable. The other `HASHNODE_*` variables (see [Getting started](GETTING_STARTED.md#configure)) also apply, except `HASHNODE_ACCESS_TOKEN`, which the server never uses. For production use, pin a version: see [Security](#security).

### Claude Desktop

Add to `claude_desktop_config.json` (**Settings → Developer → Edit Config**):

```json
{
  "mcpServers": {
    "hashnode": {
      "command": "npx",
      "args": ["-y", "@jowinjohnchemban/hashnode-client", "--host", "blog.example.com"]
    }
  }
}
```

### Claude Code

```sh
claude mcp add hashnode -- npx -y @jowinjohnchemban/hashnode-client --host blog.example.com
```

### VS Code

Add to `.vscode/mcp.json` in your project, or to your user `mcp.json`:

```json
{
  "servers": {
    "hashnode": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@jowinjohnchemban/hashnode-client", "--host", "blog.example.com"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "hashnode": {
      "command": "npx",
      "args": ["-y", "@jowinjohnchemban/hashnode-client", "--host", "blog.example.com"]
    }
  }
}
```

Other MCP clients that can start a stdio server work the same way.

## Tools

All tools are read-only. List results return summaries plus a `nextCursor`; pass it as `after` to get the next page. `first` sets the page size (1–50, default 10).

| Tool                | Arguments                            | Returns                          |
| ------------------- | ------------------------------------ | -------------------------------- |
| `get_publication`   | —                                    | Title, URL, description, author  |
| `list_posts`        | `first`, `after`, `tags` (tag slugs) | Post summaries, newest first     |
| `get_post`          | `slug` or `id`, `format`             | One post with its content        |
| `search_posts`      | `query`, `first`, `after`            | Matching post summaries          |
| `list_series`       | `first`, `after`                     | Series                           |
| `get_series`        | `slug`, `first`, `after`             | A series and a page of its posts |
| `list_static_pages` | `first`, `after`                     | Static pages                     |
| `get_static_page`   | `slug`, `format`                     | One static page with its content |
| `list_comments`     | `post_id`, `first`, `after`          | Comments on a post               |

`format` is `markdown` (default), `html` or `text`. Each result comes back as JSON text, followed by a notice that the content is untrusted, and as `structuredContent`. Content longer than the limits in [Security](#security) is truncated and marked with `contentTruncated: true`.

Problems, such as a missing post, bad arguments or Hashnode's `FORBIDDEN` for non-Pro publications, are returned as tool errors (`isError: true`) with a readable message, so the assistant can see and explain them.

## Protocol support

The server implements MCP protocol versions **2024-11-05 through 2026-07-28**:

- For versions up to 2025-11-25, it negotiates the version in the `initialize` handshake.
- For 2026-07-28, it serves stateless requests with `server/discover`. Results include `resultType` and the server identity, and `tools/list` results include cache hints.

## Use it from code

The `@jowinjohnchemban/hashnode-client/mcp` entry point exposes the server for custom setups (Node.js only):

```ts
import { createMcpServer, serveStdio } from '@jowinjohnchemban/hashnode-client/mcp';

const server = createMcpServer({
  host: 'blog.example.com', // and any other HashnodeClient option except token
  maxContentLength: 50_000, // longer post and page content is truncated (default 50,000)
  onToolCall: (event) => console.error(JSON.stringify(event)), // audit log
});
await serveStdio(server, { maxMessageLength: 1_000_000, maxConcurrentRequests: 4 });

// Or handle JSON-RPC messages yourself, for example from another transport:
const response = await server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
```

Pass `client` to reuse an existing `HashnodeClient`, including its caching and timeout settings. A client you pass in is used as it is, so don't give it a token.

## Security

The server follows the server-author recommendations of the [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html). Each item below is covered by `test/unit/mcp-security.test.ts`.

| Cheat sheet                  | What the server does                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §1 Least privilege           | Only read-only tools. It never sends an access token, even if `HASHNODE_ACCESS_TOKEN` is set, and drafts aren't exposed.                                                                                                                                                                                                 |
| §2 Tool definition integrity | Strict input schemas: `additionalProperties: false`, and every string has a `maxLength` and, where possible, a `pattern`. Descriptions only mention this server's own tools. A snapshot test fails on any change to a tool definition, so changes are reviewed and released deliberately.                                |
| §3 Isolation                 | Runs over stdio and opens no ports. It reads no files, starts no processes and only contacts the configured Hashnode endpoint. See [Sandboxing](#sandboxing).                                                                                                                                                            |
| §5 Input validation          | The server enforces every schema rule itself, because clients may not. Invalid input is rejected before any request reaches Hashnode. It runs no shell commands, opens no file paths and never fetches URLs taken from the model.                                                                                        |
| §5, §12 Untrusted output     | Every result says it is untrusted data from blog authors and readers, and the server instructions repeat this. Control, zero-width and text-direction characters are removed. Post and page content is cut to `maxContentLength`, and comments to 5,000 characters. Tools return selected fields, not raw API responses. |
| Availability                 | Upstream requests time out (`HASHNODE_TIMEOUT_MS`, default 15 s). Over stdio, messages over 1,000,000 characters are rejected without being buffered, and at most 4 requests run at once.                                                                                                                                |
| §9 Supply chain              | No runtime dependencies. Releases are built by GitHub Actions and published with npm provenance.                                                                                                                                                                                                                         |
| §10 Logging                  | The `hashnode-mcp` command writes one JSON line per tool call to stderr: time, tool, arguments, duration and whether it failed. MCP hosts keep stderr as the server log. `--quiet` turns this off. Arguments never contain secrets.                                                                                      |

Some protections are up to you and your MCP host:

- **Pin the version you reviewed**, for example `npx -y @jowinjohnchemban/hashnode-client@<version>`, instead of always running the latest release. To check that an installed copy was built from this repository, run `npm audit signatures` in the project where it's installed; it should report a verified attestation.
- **Review the tools** when you first connect, and again if the tool list changes after an upgrade. The release notes list every change.
- **Keep approval prompts on** in your MCP host, especially when other servers that can take actions are connected. Content from this server, such as comments, could try to persuade the assistant to misuse those other tools.
- **Treat reader content as untrusted**, even when it appears on your own blog.

### Sandboxing

The server needs no file writes, child processes or other permissions, so it runs under [Node.js's permission model](https://nodejs.org/api/permissions.html). Install the package, then start it with read access to its own folder only:

```sh
npm install --global @jowinjohnchemban/hashnode-client
PKG="$(npm root --global)/@jowinjohnchemban/hashnode-client"
node --permission --allow-fs-read="$PKG" "$PKG/dist/cli.js" --host blog.example.com
```

Use the same `node` command and arguments in your MCP host's configuration, with the folder path written out. In this mode, file writes and child processes are denied. Node.js 22's permission model doesn't restrict network access; use a container or firewall rules for that.

## Developing this repository

The repository includes MCP configs for contributors, in `.vscode/mcp.json` (VS Code) and `.mcp.json` (other agents):

- **GitHub's MCP server** for issues, PRs and Actions. `.mcp.json` reads a token from `GITHUB_PERSONAL_ACCESS_TOKEN`; VS Code signs in with OAuth.
- **This project's server**, run from the local build (`pnpm build` first), against the host you provide.
