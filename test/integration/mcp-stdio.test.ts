/**
 * End-to-end test of the published MCP server: starts the built `hashnode-mcp`
 * CLI and talks to it with the official MCP SDK client over stdio. Requires
 * `pnpm build` first (`pnpm test:integration` builds automatically).
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = resolve(import.meta.dirname, '../../dist/cli.js');
const host = process.env.HASHNODE_CONTRACT_HOST ?? 'engineering.hashnode.com';

describe('hashnode-mcp CLI', () => {
  it('is built', () => {
    expect(existsSync(CLI), 'run `pnpm build` first').toBe(true);
  });

  it('prints help and version', () => {
    expect(execFileSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' })).toContain(
      'Usage: hashnode-mcp',
    );
    expect(execFileSync(process.execPath, [CLI, '--version'], { encoding: 'utf8' }).trim()).toMatch(
      /^\d+\.\d+\.\d+/,
    );
  });

  it('rejects unknown arguments', () => {
    expect(() =>
      execFileSync(process.execPath, [CLI, '--nope'], { encoding: 'utf8', stdio: 'pipe' }),
    ).toThrow(/Unknown argument: --nope/);
  });
});

describe('MCP over stdio with the official SDK client', () => {
  const client = new Client({ name: 'hashnode-client-tests', version: '1.0.0' });

  beforeAll(async () => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [CLI, '--host', host], env }),
    );
  });

  afterAll(async () => {
    await client.close();
  });

  it('completes the handshake', () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'hashnode' });
    expect(client.getServerCapabilities()).toMatchObject({ tools: {} });
    expect(client.getInstructions()).toContain(host);
  });

  it('lists the tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toContain('get_post');
    expect(tools).toHaveLength(9);
  });

  it('calls a tool against the live API', async () => {
    const result = await client.callTool({ name: 'get_publication', arguments: {} });
    const [content] = result.content as { type: string; text: string }[];
    expect(content?.type).toBe('text');
    // A non-Pro publication returns FORBIDDEN as a tool error; a Pro one returns data.
    if (result.isError) expect(content?.text).toMatch(/^FORBIDDEN: /);
    else expect(result.structuredContent).toMatchObject({ id: expect.any(String) });
  });

  it('reports bad arguments as a tool error', async () => {
    const result = await client.callTool({ name: 'search_posts', arguments: {} });
    expect(result.isError).toBe(true);
  });
});
