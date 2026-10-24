import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

// semantic-release writes the release version to package.json before building.
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts', 'src/webhooks.ts', 'src/mcp.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  clean: true,
  define: { __PKG_VERSION__: JSON.stringify(version) },
});
