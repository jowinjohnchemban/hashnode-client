#!/usr/bin/env node
/**
 * `hashnode-mcp`: runs the Hashnode MCP server over stdio.
 *
 * Usage: hashnode-mcp [--host <host>] [--version] [--help]
 * Configuration also comes from the HASHNODE_* environment variables.
 */

import { createMcpServer, serveStdio } from './mcp';

declare const __PKG_VERSION__: string;

const HELP = `Usage: hashnode-mcp [options]

Runs a Model Context Protocol server over stdio that gives AI assistants
read-only access to a Hashnode publication.

Options:
  --host <host>  Publication host (default: HASHNODE_PUBLICATION_HOST)
  --version      Print the version
  --help         Print this help

Environment:
  HASHNODE_PUBLICATION_HOST  Publication host, e.g. blog.example.com
  HASHNODE_ACCESS_TOKEN      Personal access token (optional)
  HASHNODE_API_URL           GraphQL endpoint (optional)
  HASHNODE_TIMEOUT_MS        Request timeout in milliseconds (optional)
`;

function parseArgs(argv: string[]): { host?: string; help: boolean; version: boolean } {
  const result: { host?: string; help: boolean; version: boolean } = {
    help: false,
    version: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--version' || arg === '-v') result.version = true;
    else if (arg === '--host') result.host = argv[++i];
    else if (arg?.startsWith('--host=')) result.host = arg.slice('--host='.length);
    else throw new Error(`Unknown argument: ${String(arg)}\n\n${HELP}`);
  }
  return result;
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
  await serveStdio(createMcpServer(args.host ? { host: args.host } : {}));
}

main().catch((error: unknown) => {
  // stdout carries protocol messages only, so errors go to stderr.
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
