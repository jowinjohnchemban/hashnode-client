/**
 * Keeps the bundled Agent Skill (skills/hashnode-client) accurate: it must
 * follow the Agent Skills spec, and every method, import and MCP tool it
 * mentions must exist, so AI agents are never told to use something that
 * isn't there.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as root from '../../src';
import { HashnodeClient } from '../../src';
import * as mcp from '../../src/mcp';
import * as webhooks from '../../src/webhooks';

const SKILL_DIR = join(import.meta.dirname, '../../skills/hashnode-client');
const files = [
  join(SKILL_DIR, 'SKILL.md'),
  ...readdirSync(join(SKILL_DIR, 'references')).map((file) => join(SKILL_DIR, 'references', file)),
];
const text = files.map((file) => readFileSync(file, 'utf8')).join('\n');
const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');

describe('Agent Skill', () => {
  it('follows the Agent Skills spec', () => {
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? '';
    const name = /^name: (.+)$/m.exec(frontmatter)?.[1];
    const description = /^description: (.+)$/m.exec(frontmatter)?.[1] ?? '';

    expect(name).toBe('hashnode-client'); // must match the directory name
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(skill.split('\n').length).toBeLessThan(500);
  });

  it('links only to reference files that exist', () => {
    for (const [, target] of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
      expect(() => readFileSync(join(SKILL_DIR, target!)), target).not.toThrow();
    }
  });

  it('only calls client methods that exist', () => {
    const called = new Set([...text.matchAll(/\bhashnode\.(\w+)\(/g)].map((m) => m[1]!));
    const listed = new Set(
      // camelCase names only; snake_case names are MCP tools, checked below.
      [...text.matchAll(/`((?:get|search|iterate|request)[A-Za-z]*)\b(?!_)/g)].map((m) => m[1]!),
    );
    const methods = new Set(Object.getOwnPropertyNames(HashnodeClient.prototype));
    const convenience = new Set(Object.keys(root));

    expect(called.size).toBeGreaterThan(5);
    for (const name of called) expect(methods.has(name), `hashnode.${name}()`).toBe(true);
    for (const name of listed) {
      expect(methods.has(name) || convenience.has(name), `\`${name}\``).toBe(true);
    }
  });

  it('only imports names the package exports', () => {
    const entries: Record<string, Record<string, unknown>> = {
      '@jowinjohnchemban/hashnode-client': root,
      '@jowinjohnchemban/hashnode-client/webhooks': webhooks,
      '@jowinjohnchemban/hashnode-client/mcp': mcp,
    };
    const imports = [...text.matchAll(/import \{([^}]+)\} from '(@jowinjohnchemban\/[^']+)'/g)];

    expect(imports.length).toBeGreaterThan(3);
    for (const [, names, from] of imports) {
      const entry = entries[from!];
      expect(entry, from).toBeDefined();
      for (const name of names!
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)) {
        expect(entry, `${name} from ${from!}`).toHaveProperty(name);
      }
    }
  });

  it('names only MCP tools the server provides', () => {
    const tools = new Set(
      mcp.createMcpServer({ host: 'blog.example.com' }).tools.map((t) => t.name),
    );
    const mentioned = [...text.matchAll(/`((?:get|list|search)_\w+)`/g)].map((m) => m[1]!);

    expect(mentioned.length).toBeGreaterThanOrEqual(tools.size);
    for (const name of mentioned) expect(tools.has(name), name).toBe(true);
    for (const name of tools) expect(mentioned, name).toContain(name);
  });
});
