// scripts/tested-tree.mjs lets a push to main deploy before main's own checks
// finish, when the pull request's run already passed on the identical tree.
// It must fail closed: every gap below answers tested=false, so deploy waits.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { artifactName, prove } from '../scripts/tested-tree.mjs';

const repo = 'ourostack/ouroboros-website';
const sha = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const head = 'c'.repeat(40);
const now = Date.parse('2026-11-14T03:00:00Z');

const goodRun = () => ({
  id: 7,
  path: '.github/workflows/site-checks.yml',
  event: 'pull_request',
  head_repository: { full_name: repo },
  head_sha: head,
  status: 'completed',
  conclusion: 'success',
  updated_at: '2026-11-14T02:59:00Z',
});
const goodPull = () => ({ number: 138, merge_commit_sha: sha, merged_at: '2026-11-14T02:59:05Z', base: { ref: 'main' }, head: { sha: head, repo: { full_name: repo } } });

// A fake GitHub API. `runs` is a list of run states returned in turn, so a
// test can model a run that finishes while proof polls.
function fakeApi({ commit = { tree: { sha: tree } }, pulls = [goodPull()], artifacts = [{ name: artifactName(tree), expired: false, workflow_run: { id: 7 } }], runs = [goodRun()], fail } = {}) {
  let call = 0;
  return async (url) => {
    const path = new URL(url).pathname + new URL(url).search;
    if (fail && path.includes(fail)) return { ok: false, status: 500, json: async () => ({}) };
    const body = path.startsWith(`/repos/${repo}/git/commits/`) ? commit
      : path.endsWith('/pulls') ? pulls
      : path.includes('/actions/artifacts') ? { artifacts }
      : path.includes('/actions/runs/') ? runs[Math.min(call++, runs.length - 1)]
      : undefined;
    if (body === undefined) throw new Error(`unexpected ${path}`);
    return { ok: true, status: 200, json: async () => body };
  };
}

async function run(opts = {}, { clock = now, waitMs = 120_000 } = {}) {
  let t = clock;
  return prove({ repo, sha, token: 't', fetchImpl: fakeApi(opts), now: () => t, sleep: async (ms) => { t += ms; }, waitMs, pollMs: 15_000 });
}

test('a passed same-repo pull request run on the identical tree proves it', async () => {
  const r = await run();
  assert.equal(r.tested, true, r.reason);
  assert.equal(r.run, 7);
});

test('waits for a run that is still finishing, then trusts its success', async () => {
  const r = await run({ runs: [{ ...goodRun(), status: 'in_progress', conclusion: null }, { ...goodRun(), updated_at: '2026-11-14T03:00:15Z' }] });
  assert.equal(r.tested, true, r.reason);
});

const failsClosed = {
  'a run from a fork': { runs: [{ ...goodRun(), head_repository: { full_name: 'someone/fork' } }] },
  'a pull request from a fork': { pulls: [{ ...goodPull(), head: { sha: head, repo: { full_name: 'someone/fork' } } }] },
  'a run on another head than the merged one': { runs: [{ ...goodRun(), head_sha: 'd'.repeat(40) }] },
  'a failed run': { runs: [{ ...goodRun(), conclusion: 'failure' }] },
  'a cancelled run': { runs: [{ ...goodRun(), conclusion: 'cancelled' }] },
  'a run still in progress after the wait': { runs: [{ ...goodRun(), status: 'in_progress', conclusion: null }] },
  'a push run': { runs: [{ ...goodRun(), event: 'push' }] },
  'a dispatched run': { runs: [{ ...goodRun(), event: 'workflow_dispatch' }] },
  'another workflow': { runs: [{ ...goodRun(), path: '.github/workflows/preview.yml' }] },
  'a run older than a day': { runs: [{ ...goodRun(), updated_at: '2026-11-13T02:00:00Z' }] },
  'a run dated in the future': { runs: [{ ...goodRun(), updated_at: '2026-11-14T04:00:00Z' }] },
  'no artifact for the tree': { artifacts: [] },
  'an expired artifact': { artifacts: [{ name: artifactName(tree), expired: true, workflow_run: { id: 7 } }] },
  'an artifact for another tree': { artifacts: [{ name: artifactName('e'.repeat(40)), expired: false, workflow_run: { id: 7 } }] },
  'a commit no pull request merged': { pulls: [] },
  'a pull request merged into another branch': { pulls: [{ ...goodPull(), base: { ref: 'next' } }] },
  'a pull request whose merge commit is another': { pulls: [{ ...goodPull(), merge_commit_sha: 'f'.repeat(40) }] },
  'two pull requests claiming the commit': { pulls: [goodPull(), { ...goodPull(), number: 139 }] },
  'a commit without a tree': { commit: {} },
};

for (const [name, opts] of Object.entries(failsClosed)) {
  test(`fails closed: ${name}`, async () => {
    const r = await run(opts);
    assert.equal(r.tested, false, `${name} was trusted`);
  });
}

test('fails closed when any API call errors (the script turns the throw into tested=false)', async () => {
  for (const fail of ['/git/commits/', '/pulls', '/actions/artifacts', '/actions/runs/']) {
    await assert.rejects(run({ fail }), /500/, fail);
  }
  const src = readFileSync(new URL('../scripts/tested-tree.mjs', import.meta.url), 'utf8');
  assert.match(src, /catch \(err\) \{\s*result = \{ tested: false/);
});

test('fails closed without a repository, a full commit sha or a token', async () => {
  for (const args of [{ repo: '', sha, token: 't' }, { repo, sha: 'abc', token: 't' }, { repo, sha, token: '' }]) {
    const r = await prove({ ...args, fetchImpl: () => assert.fail('no API call without inputs') });
    assert.equal(r.tested, false);
  }
});

// The workflow wiring is what makes the answer matter: deploy-early only on
// tested=true, the fallback deploy only after main's checks pass, and the
// artifact only from pull request runs.
const workflow = readFileSync(new URL('../.github/workflows/site-checks.yml', import.meta.url), 'utf8');
const job = (key) => workflow.split(/\n  (?=[a-z-]+:\n)/).find((s) => s.startsWith(`${key}:\n`)) ?? '';

test('site-checks deploys early only on a proven tree, and otherwise only after its own checks pass', () => {
  assert.match(job('deploy-early'), /needs: proof\n/);
  assert.match(job('deploy-early'), /needs\.proof\.outputs\.tested == 'true'/);
  assert.match(job('deploy-early'), /github\.event_name == 'push'/);
  assert.match(job('deploy'), /needs: \[site-checks, deploy-early\]/);
  assert.match(job('deploy'), /needs\.site-checks\.result == 'success'/);
  assert.match(job('deploy'), /needs\.deploy-early\.result != 'success'/);
  assert.match(job('deploy'), /github\.ref == 'refs\/heads\/main'/);
  for (const key of ['deploy-early', 'deploy']) assert.match(job(key), /uses: \.\/\.github\/workflows\/deploy\.yml/);
  assert.match(job('tests'), /if: github\.event_name == 'pull_request'[\s\S]*tested-tree-\$\{\{ steps\.tree\.outputs\.sha \}\}/);
});

test('deploy.yml runs only when site-checks calls it', () => {
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.match(deploy, /\non:\n  workflow_call:\n\n/);
  assert.doesNotMatch(deploy, /\n  push:|\n  pull_request|\n  workflow_dispatch/);
});
