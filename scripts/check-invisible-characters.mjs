// Fails if any tracked text file contains invisible or bidirectional control
// characters, which can hide code from reviewers ("Trojan Source").
// Write such characters as escapes (for example \u200B) instead.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const INVISIBLE =
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/;

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && !/\.(png|jpe?g|gif|ico|woff2?)$/i.test(file));

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted in the working tree
  }
  text.split('\n').forEach((line, index) => {
    const match = INVISIBLE.exec(line);
    if (match) {
      const code = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      findings.push(`${file}:${index + 1}: U+${code}`);
    }
  });
}

if (findings.length > 0) {
  console.error(
    `Invisible characters found; write them as escapes instead:\n  ${findings.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`No invisible characters in ${files.length} files.`);
