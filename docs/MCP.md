# MCP server

The package includes a [Model Context Protocol](https://modelcontextprotocol.io) server. It gives AI assistants such as Claude, ChatGPT, Cursor and VS Code Copilot read-only access to a Hashnode publication: they can search posts, read them, and browse series, static pages and comments.

The server runs locally over stdio with `npx` and needs no extra dependencies. Like the client, it needs a publication on a Hashnode **Pro plan**.

## Set up

Every client starts the same command:

```sh
npx -y @jowinjohnchemban/hashnode-client --host blog.example.com
```

`--host` can be replaced by the `HASHNODE_PUBLICATION_HOST` environment variable. The other `HASHNODE_*` variables (see [Getting started](GETTING_STARTED.md#configure)) also apply.

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

`format` is `markdown` (default), `html` or `text`. Results come back both as JSON text and as `structuredContent`.

Problems, such as a missing post, bad arguments or Hashnode's `FORBIDDEN` for non-Pro publications, are returned as tool errors (`isError: true`) with a readable message, so the assistant can see and explain them.

## Protocol support

The server implements MCP protocol versions **2024-11-05 through 2026-07-28**:

- For versions up to 2025-11-25, it negotiates the version in the `initialize` handshake.
- For 2026-07-28, it serves stateless requests with `server/discover`. Results include `resultType` and the server identity, and `tools/list` results include cache hints.

## Use it from code

The `@jowinjohnchemban/hashnode-client/mcp` entry point exposes the server for custom setups (Node.js only):

```ts
import { createMcpServer, serveStdio } from '@jowinjohnchemban/hashnode-client/mcp';

const server = createMcpServer({ host: 'blog.example.com' }); // any HashnodeClient options
await serveStdio(server);

// Or handle JSON-RPC messages yourself, for example from another transport:
const response = await server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
```

Pass `client` to reuse an existing `HashnodeClient`, including its caching and timeout settings.

## Security

- The server is read-only. It has no tools that create, change or delete anything.
- It doesn't need an access token, and drafts aren't exposed. Don't set `HASHNODE_ACCESS_TOKEN` for it.
- It talks only to the Hashnode API and only over stdio; it doesn't open network ports.
- Tool output contains your published content. Content from comments is written by other people, so treat it as untrusted input to the assistant.

## Developing this repository

The repository includes MCP configs for contributors, in `.vscode/mcp.json` (VS Code) and `.mcp.json` (other agents):

- **GitHub's MCP server** for issues, PRs and Actions. `.mcp.json` reads a token from `GITHUB_PERSONAL_ACCESS_TOKEN`; VS Code signs in with OAuth.
- **This project's server**, run from the local build (`pnpm build` first), against the host you provide.
