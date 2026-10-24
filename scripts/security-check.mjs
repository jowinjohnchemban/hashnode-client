// Security checklist for this repository. Run with `pnpm security`.
//
// Each check is automated and maps to OWASP guidance:
// - OWASP Top 10 CI/CD Security Risks (CICD-SEC): https://owasp.org/www-project-top-10-ci-cd-security-risks/
// - OWASP MCP Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html
// - OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
//
// Exits with code 1 if any check fails.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// -z gives raw, NUL-separated paths; without it git quotes unusual names,
// which would then be skipped instead of scanned.
const files = execFileSync('git', ['ls-files', '-z', '-co', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter((file) => file && existsSync(file))
  .filter((file) => !/\.(png|jpe?g|gif|ico|woff2?)$/i.test(file));

const read = (file) => readFileSync(file, 'utf8');
const workflows = files.filter((file) => /^\.github\/workflows\/.+\.ya?ml$/.test(file));
const source = files.filter((file) => /^src\/.+\.ts$/.test(file));

/** Returns `file:line: text` for each line matching `pattern`. */
function grep(fileList, pattern, { skip } = {}) {
  const hits = [];
  for (const file of fileList) {
    if (skip?.(file)) continue;
    read(file)
      .split('\n')
      .forEach((line, index) => {
        if (pattern.test(line)) hits.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return hits;
}

/** Returns the trimmed contents of each `${{ ... }}` expression in a line. */
function expressionsIn(line) {
  const expressions = [];
  let start = line.indexOf('${{');
  while (start !== -1) {
    const end = line.indexOf('}}', start + 3);
    if (end === -1) break;
    expressions.push(line.slice(start + 3, end).trim());
    start = line.indexOf('${{', end + 2);
  }
  return expressions;
}

const checks = [
  {
    name: 'Trojan Source: no invisible or bidirectional characters',
    reference: 'CVE-2021-42574; OWASP MCP §2',
    run() {
      // Control characters (except tab, line feed, carriage return), zero-width
      // and bidirectional formatting characters can hide code from reviewers.
      const invisible =
        // eslint-disable-next-line no-control-regex -- matching control characters is the point
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/u;
      return grep(files, invisible).map((hit) => {
        const [location] = hit.split(': ');
        const line = read(location.split(':')[0]).split('\n')[Number(location.split(':')[1]) - 1];
        const code = invisible.exec(line)[0].codePointAt(0).toString(16).toUpperCase();
        return `${location}: U+${code.padStart(4, '0')} (write it as an escape instead)`;
      });
    },
  },
  {
    name: 'Secrets: no tokens, keys or .env files committed',
    reference: 'CICD-SEC-6; OWASP Secrets Management',
    run() {
      const secret = new RegExp(
        [
          'npm_[A-Za-z0-9]{36}', // npm access token
          'gh[pousr]_[A-Za-z0-9]{36,}', // GitHub tokens
          'github_pat_[A-Za-z0-9_]{60,}', // GitHub fine-grained token
          'AKIA[0-9A-Z]{16}', // AWS access key ID
          'xox[abprs]-[A-Za-z0-9-]{10,}', // Slack token
          '-----BEGIN [A-Z ]*' + 'PRIVATE KEY-----', // private key (split so this file doesn't match)
          '(HASHNODE_ACCESS_TOKEN|HASHNODE_WEBHOOK_SECRET|NPM_TOKEN)=[A-Za-z0-9_-]{16,}', // assigned secret
        ].join('|'),
      );
      const envFiles = files
        .filter((file) => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.env.example'))
        .map((file) => `${file}: .env files must not be committed`);
      return [...envFiles, ...grep(files, secret, { skip: (file) => file === 'pnpm-lock.yaml' })];
    },
  },
  {
    name: 'Dependencies: no high or critical advisories',
    reference: 'CICD-SEC-3; OWASP MCP §9',
    run() {
      try {
        execFileSync('pnpm', ['audit', '--audit-level', 'high'], {
          encoding: 'utf8',
          stdio: 'pipe',
          shell: process.platform === 'win32',
        });
        return [];
      } catch (error) {
        const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
        return [output.split('\n').slice(-5).join('\n  ') || 'pnpm audit failed'];
      }
    },
  },
  {
    name: 'Supply chain: no runtime dependencies, pnpm lockfile only',
    reference: 'CICD-SEC-3; OWASP MCP §9',
    run() {
      const pkg = JSON.parse(read('package.json'));
      const problems = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies }).map(
        (name) =>
          `package.json: runtime dependency "${name}" (the package must stay dependency-free)`,
      );
      if (!files.includes('pnpm-lock.yaml')) problems.push('pnpm-lock.yaml is missing');
      for (const lockfile of ['package-lock.json', 'yarn.lock', 'npm-shrinkwrap.json']) {
        if (files.includes(lockfile)) problems.push(`${lockfile}: use pnpm only`);
      }
      return problems;
    },
  },
  {
    name: 'Workflows: third-party actions pinned to a commit SHA, images to a digest',
    reference: 'CICD-SEC-3, CICD-SEC-8',
    run() {
      return [
        ...grep(
          workflows,
          /uses:\s*["']?(?!actions\/|github\/|\.\/|docker:)[\w.-]+\/[\w./-]+@(?![0-9a-f]{40}\b)/,
        ),
        // docker:// actions must use an immutable digest, not a tag.
        ...grep(workflows, /uses:\s*["']?docker:\/\/(?![^\s"'#]*@sha256:[0-9a-f]{64})/),
      ];
    },
  },
  {
    name: 'Workflows: explicit token permissions',
    reference: 'CICD-SEC-2, CICD-SEC-5',
    run() {
      return workflows
        .filter((file) => !/^permissions:/m.test(read(file)))
        .map((file) => `${file}: add a top-level "permissions:" block`);
    },
  },
  {
    name: 'Workflows: no untrusted input in expressions',
    reference: 'CICD-SEC-4 (poisoned pipeline execution)',
    run() {
      // Attacker-controlled fields must be read from the event payload in code
      // or passed through env, never expanded directly into a script.
      const untrusted =
        /^github\.(head_ref|event\.(pull_request|issue|comment|review|head_commit|commits|pages)[\w.[\]*]*\.(title|body|ref|label|message|name|email|default_branch|description))\b/;
      const hits = [];
      for (const file of workflows) {
        read(file)
          .split('\n')
          .forEach((line, index) => {
            for (const expression of expressionsIn(line)) {
              // Treat github.event['pull_request']["title"] like the dot form.
              const normalized = expression.replace(/\[\s*['"]([\w-]+)['"]\s*\]/g, '.$1');
              if (untrusted.test(normalized)) {
                hits.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
                break;
              }
            }
          });
      }
      return hits;
    },
  },
  {
    name: 'Workflows: pull_request_target never checks out pull request code',
    reference: 'CICD-SEC-4',
    run() {
      return workflows
        .filter((file) => /pull_request_target/.test(read(file)))
        .filter((file) => /uses:\s*actions\/checkout@/.test(read(file)))
        .map((file) => `${file}: pull_request_target workflows must not use actions/checkout`);
    },
  },
  {
    name: 'Library code: no eval, child processes, file writes or plain HTTP',
    reference: 'OWASP MCP §3, §5',
    run() {
      return grep(
        source,
        /\beval\(|new Function\(|child_process|\b(writeFile|appendFile|createWriteStream|unlink|rm)(Sync)?\(|["'`]http:\/\//,
      );
    },
  },
];

let failed = 0;
console.log('Security checklist\n');
for (const check of checks) {
  let problems;
  try {
    problems = check.run();
  } catch (error) {
    problems = [`check crashed: ${error instanceof Error ? error.message : String(error)}`];
  }
  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${check.name}  [${check.reference}]`);
  for (const problem of problems) console.log(`          ${problem}`);
}

console.log(
  `\n${checks.length - failed}/${checks.length} checks passed (${files.length} files, ${workflows.length} workflows).`,
);
if (failed > 0) process.exit(1);
