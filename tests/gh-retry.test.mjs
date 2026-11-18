import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// sync-brand.yml makes every gh call through scripts/gh-retry.sh, so a secondary rate limit
// delays one call by seconds instead of failing the sync for the next 10-minute run.

const root = new URL('..', import.meta.url).pathname;

// A fake "gh" that fails with the given messages in turn, then prints "ok".
function fake(failures) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-retry-'));
  const count = path.join(dir, 'count');
  fs.writeFileSync(count, '0');
  fs.writeFileSync(
    path.join(dir, 'gh'),
    `#!/bin/bash
n=$(( $(cat "${count}") + 1 )); echo $n > "${count}"
msgs=(${failures.map((m) => JSON.stringify(m)).join(' ')})
if [ "$n" -le ${failures.length} ]; then echo "\${msgs[$((n-1))]}" >&2; exit 1; fi
echo ok
`,
    { mode: 0o755 },
  );
  return { dir, calls: () => Number(fs.readFileSync(count, 'utf8')) };
}

const run = (dir, env = {}) =>
  spawnSync('bash', ['-c', 'source scripts/gh-retry.sh; gh_retry gh pr list'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GH_RETRY_SLEEP: '0', ...env },
  });

test('a rate limit is retried until the call works, and the output comes through', () => {
  const f = fake(['gh: API rate limit exceeded for user ID 1', 'HTTP 502: Bad Gateway']);
  const r = run(f.dir);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'ok');
  assert.equal(f.calls(), 3);
});

test('an error that is not transient fails at once', () => {
  const f = fake(['gh: Pull Request is not mergeable']);
  const r = run(f.dir);
  assert.notEqual(r.status, 0);
  assert.equal(f.calls(), 1);
});

test('a rate limit that never clears gives up after GH_RETRY_TRIES', () => {
  const f = fake(Array(10).fill('gh: API rate limit exceeded'));
  const r = run(f.dir, { GH_RETRY_TRIES: '4' });
  assert.notEqual(r.status, 0);
  assert.equal(f.calls(), 4);
});

test('sync-brand.yml makes every gh call through gh_retry', () => {
  const yml = fs.readFileSync(path.join(root, '.github/workflows/sync-brand.yml'), 'utf8');
  const bare = yml.split('\n').filter((l) => /(^|[\s$(|])gh (api|pr|run|workflow)\b/.test(l) && !/gh_retry gh /.test(l) && !/^\s*#/.test(l));
  assert.deepEqual(bare, []);
  execFileSync('bash', ['-n', 'scripts/gh-retry.sh'], { cwd: root });
});
