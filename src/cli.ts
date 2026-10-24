#!/usr/bin/env node
/**
 * `hashnode-mcp`: runs the Hashnode MCP server over stdio.
 *
 * Usage: hashnode-mcp [--host <host>] [--quiet] [--version] [--help]
 * Configuration also comes from the HASHNODE_* environment variables.
 */

import { createMcpServer, serveStdio, type McpToolCallEvent } from './mcp';

declare const __PKG_VERSION__: string;

const HELP = `Usage: hashnode-mcp [options]

Runs a Model Context Protocol server over stdio that gives AI assistants
read-only access to a Hashnode publication.

Options:
  --host <host>  Publication host (default: HASHNODE_PUBLICATION_HOST)
  --quiet        Don't log tool calls to stderr
  --version      Print the version
  --help         Print this help

Environment:
  HASHNODE_PUBLICATION_HOST  Publication host, e.g. blog.example.com
  HASHNODE_API_URL           GraphQL endpoint (optional)
  HASHNODE_TIMEOUT_MS        Request timeout in milliseconds (optional)

The server never sends an access token, even if HASHNODE_ACCESS_TOKEN is set.
Each tool call is logged to stderr as a JSON line unless --quiet is given.
`;

interface Args {
  host?: string;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const result: Args = { quiet: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--version' || arg === '-v') result.version = true;
    else if (arg === '--quiet' || arg === '-q') result.quiet = true;
    else if (arg === '--host') result.host = argv[++i];
    else if (arg?.startsWith('--host=')) result.host = arg.slice('--host='.length);
    else throw new Error(`Unknown argument: ${String(arg)}\n\n${HELP}`);
  }
  return result;
}

/** Writes one JSON line per tool call to stderr, which MCP hosts keep as server logs. */
function logToolCall(event: McpToolCallEvent): void {
  process.stderr.write(`${JSON.stringify({ event: 'tool_call', ...event })}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.version) {
    process.stdout.write(`${__PKG_VERSION__}\n`);
    return;
  }
  const server = createMcpServer({
    ...(args.host && { host: args.host }),
    ...(!args.quiet && { onToolCall: logToolCall }),
  });
  await serveStdio(server);
}

main().catch((error: unknown) => {
  // stdout carries protocol messages only, so errors go to stderr.
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
