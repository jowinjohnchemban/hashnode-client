// Fails if the npm tarball contains anything other than the expected files.
// Run after `pnpm build`: node scripts/verify-package.mjs

import { execFileSync } from 'node:child_process';

const EXPECTED = [
  'LICENSE',
  'README.md',
  'package.json',
  ...['index', 'webhooks'].flatMap((entry) => [
    `dist/${entry}.js`,
    `dist/${entry}.cjs`,
    `dist/${entry}.d.ts`,
    `dist/${entry}.d.cts`,
  ]),
].sort();

const output = execFileSync('pnpm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
const { files } = JSON.parse(output.slice(output.indexOf('{')));
const actual = files.map((file) => file.path.replaceAll('\\', '/')).sort();

const unexpected = actual.filter((path) => !EXPECTED.includes(path));
const missing = EXPECTED.filter((path) => !actual.includes(path));

if (unexpected.length || missing.length) {
  if (unexpected.length)
    console.error(`Unexpected files in package:\n  ${unexpected.join('\n  ')}`);
  if (missing.length)
    console.error(`Missing files (did you run pnpm build?):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

console.log(`Package contents OK (${actual.length} files):\n  ${actual.join('\n  ')}`);
