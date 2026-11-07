// Runs every page check (`npm run check:*`) against one served build and
// prints a pass/fail summary. This is what site-checks CI runs on every PR
// (round 21: "the brand audit and the page checks run deterministically in
// CI on every site PR, so taste reviewers judge only what a tool can't
// measure").
//
//   npm run build && npm run check:all                  (serves dist/ itself)
//   SITE_BASE=http://127.0.0.1:4321 npm run check:all   (a build served elsewhere)
//   npm run check:all -- --only drama,cta               (a subset)
//
// Each check gets `--base <SITE_BASE>` and writes its output to
// <CHECK_LOGS or check-logs>/<name>.log. Checks run CHECK_JOBS at a time
// (default 3). It fails when any check fails, and also when a check:* script
// in package.json is missing from CHECKS below, so a new check can never be
// left out of CI.

import { spawn } from 'node:child_process';
import { appendFileSync, createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from './serve-dist.mjs';

export const CHECKS = [
  'text', 'hero', 'column', 'fallback', 'seams', 'menu', 'hit', 'h1', 'gap',
  'spaces', 'ends', 'swap', 'swipe', 'headings', 'drama', 'buttons', 'grid',
  'captions', 'cta',
];

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
const declared = Object.keys(scripts).filter((s) => s.startsWith('check:') && s !== 'check:all').map((s) => s.slice(6));
const unlisted = declared.filter((n) => !CHECKS.includes(n));
const stale = CHECKS.filter((n) => !declared.includes(n));
if (unlisted.length || stale.length) {
  if (unlisted.length) console.error(`check:all is missing ${unlisted.map((n) => `check:${n}`).join(', ')}: add it to CHECKS in scripts/check-all.mjs`);
  if (stale.length) console.error(`check:all lists ${stale.map((n) => `check:${n}`).join(', ')}, which package.json does not define`);
  process.exit(1);
}

const only = opt('--only')?.split(',');
const run = only ? CHECKS.filter((n) => only.includes(n)) : CHECKS;
const logs = resolvePath(ROOT, opt('--logs') || process.env.CHECK_LOGS || 'check-logs'); // an absolute CHECK_LOGS stays as given
mkdirSync(logs, { recursive: true });
const jobs = Math.max(1, Number(process.env.CHECK_JOBS || 3));

let base = (opt('--base') || process.env.SITE_BASE || '').replace(/\/$/, '');
let server;
if (!base) {
  server = await serveDist({ port: Number(process.env.PORT || 4321) });
  base = server.base;
}
console.log(`checking ${base} with ${run.length} checks, ${jobs} at a time; logs in ${logs}`);

function check(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    const log = createWriteStream(join(logs, `${name}.log`));
    const child = spawn('npm', ['run', '--silent', `check:${name}`, '--', '--base', base], { cwd: ROOT, env: { ...process.env, SITE_BASE: base } });
    let tail = '';
    const keep = (chunk) => { log.write(chunk); tail = (tail + chunk).slice(-1500); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('close', (code) => {
      log.end();
      const seconds = Math.round((Date.now() - started) / 1000);
      console.log(`${code === 0 ? 'pass' : 'FAIL'}  check:${name}  (${seconds}s)`);
      resolve({ name, ok: code === 0, seconds, tail });
    });
  });
}

const queue = [...run];
const results = [];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  while (queue.length) results.push(await check(queue.shift()));
}));
await server?.close();

const failed = results.filter((r) => !r.ok);
const summary = ['', '| check | result | seconds |', '| --- | --- | --- |',
  ...run.map((n) => results.find((r) => r.name === n)).map((r) => `| check:${r.name} | ${r.ok ? 'pass' : '**FAIL**'} | ${r.seconds} |`)].join('\n');
console.log(summary);
for (const r of failed) console.log(`\n--- check:${r.name} (last lines; full log in ${join(logs, r.name + '.log')}) ---\n${r.tail}`);
writeFileSync(join(logs, 'summary.txt'), run.map((n) => results.find((r) => r.name === n)).map((r) => `${('check:' + r.name).padEnd(26)} ${r.ok ? 'pass' : 'FAIL'}`).join('\n') + '\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Page checks against ${base}\n${summary}\n`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
