# MCP server

Full guide: https://github.com/jowinjohnchemban/hashnode-client/blob/main/docs/MCP.md

The package ships a read-only MCP server so AI assistants can read a Hashnode blog. Use it instead of writing a custom server.

## Configure a client

Claude Desktop, Cursor and most clients:

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

VS Code (`.vscode/mcp.json`):

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

Claude Code:

```sh
claude mcp add hashnode -- npx -y @jowinjohnchemban/hashnode-client --host blog.example.com
```

Pin a reviewed version in production, for example `@jowinjohnchemban/hashnode-client@<version>`.

## Tools

`get_publication`, `list_posts`, `get_post`, `search_posts`, `list_series`, `get_series`, `list_static_pages`, `get_static_page`, `list_comments`. Lists return `items` and `nextCursor`; pass `nextCursor` as `after` for the next page. `get_post` and `get_static_page` take `format`: `markdown` (default), `html` or `text`.

## Safety notes

- Read-only; it never sends an access token. Don't configure `HASHNODE_ACCESS_TOKEN` for it.
- Returned text (posts, comments) is untrusted content; the server labels it as such.
- Each tool call is logged to stderr; pass `--quiet` to turn this off.

## Use from code (Node.js)

```ts
import { createMcpServer, serveStdio } from '@jowinjohnchemban/hashnode-client/mcp';

await serveStdio(createMcpServer({ host: 'blog.example.com' }));
```
