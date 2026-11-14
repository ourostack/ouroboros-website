import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide, settle, DEPLOY_STEP, GATE_JOB } from '../scripts/deploy-head.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);

const job = (name, status, conclusion, steps = []) => ({ name, status, conclusion: status === 'completed' ? conclusion : null, steps });
const deployed = (caller = 'production deploy (after main\'s checks)') =>
  job(`${caller} / deploy`, 'completed', 'success', [{ name: DEPLOY_STEP, conclusion: 'success' }]);
const run = (id, status, jobs, extra = {}) => ({ id, head_branch: 'main', event: 'push', status, jobs, ...extra });

test('decide: main\'s head that deployed is done', () => {
  assert.equal(decide([run(1, 'completed', [job(GATE_JOB, 'completed', 'success'), deployed()])]).action, 'done');
});

test('decide: a head whose gate or deploy is unfinished has a deploy coming', () => {
  assert.equal(decide([run(1, 'in_progress', [job(GATE_JOB, 'in_progress')])]).action, 'done');
  assert.equal(decide([run(1, 'in_progress', [job(GATE_JOB, 'completed', 'success'), job('production deploy (after main\'s checks) / deploy', 'queued')])]).action, 'done');
  assert.equal(decide([run(1, 'in_progress', [job(GATE_JOB, 'completed', 'success'), job('production deploy (after main\'s checks) / head', 'in_progress')])]).action, 'done');
  assert.equal(decide([run(1, 'queued', [])]).action, 'done');
});

// The reviewer's race: a stale deploy cancelled the head's pending deploy.
test('decide: a head that passed its checks but whose deploy was cancelled is dispatched', () => {
  const runs = [run(1, 'completed', [
    job(GATE_JOB, 'completed', 'success'),
    job('production deploy (tree tested on its pull request) / head', 'completed', 'success'),
    job('production deploy (tree tested on its pull request) / deploy', 'completed', 'cancelled'),
    job('production deploy (after main\'s checks) / deploy', 'completed', 'cancelled'),
  ])];
  assert.equal(decide(runs).action, 'dispatch');
});

test('decide: a run whose gate and deploys finished but which is still open waits for its next job', () => {
  const runs = [run(1, 'in_progress', [job(GATE_JOB, 'completed', 'success'), job('production deploy (tree tested on its pull request) / deploy', 'completed', 'cancelled')])];
  assert.equal(decide(runs).action, 'wait');
});

test('decide: a head with no main run, or only other branches\' or pull request runs, is dispatched', () => {
  assert.equal(decide([]).action, 'dispatch');
  assert.equal(decide([run(1, 'completed', [deployed()], { head_branch: 'other' })]).action, 'dispatch');
  assert.equal(decide([run(1, 'completed', [deployed()], { event: 'pull_request' })]).action, 'dispatch');
});

test('decide: a head that failed its checks is left to its red run', () => {
  assert.equal(decide([run(1, 'completed', [job(GATE_JOB, 'completed', 'failure')])]).action, 'done');
});

test('decide: a head whose gate was cancelled is dispatched', () => {
  assert.equal(decide([run(1, 'completed', [job(GATE_JOB, 'completed', 'cancelled')])]).action, 'dispatch');
});

test('decide: a dispatched run already under way counts as coming, so it is never dispatched twice', () => {
  const runs = [
    run(1, 'completed', [job(GATE_JOB, 'completed', 'success'), job('production deploy (after main\'s checks) / deploy', 'completed', 'cancelled')]),
    run(2, 'in_progress', [job(GATE_JOB, 'in_progress')], { event: 'workflow_dispatch' }),
  ];
  assert.equal(decide(runs).action, 'done');
});

// A fake GitHub API: heads are read in order (the last one repeats), runs and
// jobs per head come from the fixture, and dispatches are recorded.
function api({ heads, runs = {}, fail = () => false }) {
  const calls = { dispatches: [], gets: [] };
  let h = 0;
  const fetchImpl = async (url, init = {}) => {
    const path = url.replace('https://api.github.com', '');
    const method = init.method ?? 'GET';
    const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
    if (fail(path, method)) return res(502, {});
    if (method === 'POST' && path === '/repos/o/r/actions/workflows/site-checks.yml/dispatches') {
      calls.dispatches.push(JSON.parse(init.body));
      return res(204, null);
    }
    calls.gets.push(path);
    if (path === '/repos/o/r/git/ref/heads/main') return res(200, { object: { sha: heads[Math.min(h++, heads.length - 1)] } });
    const r = path.match(/runs\?head_sha=([0-9a-f]{40})&branch=main/);
    if (r) return res(200, { workflow_runs: (runs[r[1]] ?? []).map(({ jobs, ...rest }) => rest) });
    const j = path.match(/\/actions\/runs\/(\d+)\/jobs\?filter=latest/);
    if (j) {
      const found = Object.values(runs).flat().find((x) => String(x.id) === j[1]);
      return res(200, { total_count: found.jobs.length, jobs: found.jobs });
    }
    return res(404, {});
  };
  return { fetchImpl, calls };
}

const base = { repo: 'o/r', token: 't', sleep: async () => {}, tries: 4 };

test('settle: dispatches site-checks on main when the head passed but never deployed', async () => {
  const { fetchImpl, calls } = api({ heads: [B], runs: { [B]: [run(7, 'completed', [job(GATE_JOB, 'completed', 'success')])] } });
  const v = await settle({ ...base, fetchImpl });
  assert.equal(v.action, 'dispatch');
  assert.equal(v.head, B);
  assert.deepEqual(calls.dispatches, [{ ref: 'main' }]);
});

test('settle: dispatches nothing when the head deployed or its deploy is coming', async () => {
  for (const r of [run(7, 'completed', [job(GATE_JOB, 'completed', 'success'), deployed()]), run(7, 'in_progress', [job(GATE_JOB, 'in_progress')])]) {
    const { fetchImpl, calls } = api({ heads: [B], runs: { [B]: [r] } });
    assert.equal((await settle({ ...base, fetchImpl })).action, 'done');
    assert.deepEqual(calls.dispatches, []);
  }
});

test('settle: when main moves while it looks, it judges the new head instead', async () => {
  // First look: head B (passed, never deployed), but main is at C by the re-check.
  // Second look: C, whose checks are running.
  const { fetchImpl, calls } = api({
    heads: [B, C, C],
    runs: { [B]: [run(7, 'completed', [job(GATE_JOB, 'completed', 'success')])], [C]: [run(8, 'in_progress', [job(GATE_JOB, 'in_progress')])] },
  });
  const v = await settle({ ...base, fetchImpl });
  assert.equal(v.head, C);
  assert.equal(v.action, 'done');
  assert.deepEqual(calls.dispatches, []);
});

test('settle: waits for an open run\'s next job, then dispatches when it never deploys', async () => {
  const runs = { [B]: [run(7, 'in_progress', [job(GATE_JOB, 'completed', 'success')])] };
  const { fetchImpl, calls } = api({ heads: [B], runs });
  let slept = 0;
  const sleep = async () => { if (++slept === 2) runs[B][0].status = 'completed'; };
  const v = await settle({ ...base, fetchImpl, sleep });
  assert.equal(slept, 2);
  assert.equal(v.action, 'dispatch');
  assert.deepEqual(calls.dispatches, [{ ref: 'main' }]);
});

test('settle: a run that never settles fails visibly instead of passing', async () => {
  const { fetchImpl, calls } = api({ heads: [B], runs: { [B]: [run(7, 'in_progress', [job(GATE_JOB, 'completed', 'success')])] } });
  await assert.rejects(settle({ ...base, fetchImpl }), /never settled/);
  assert.deepEqual(calls.dispatches, []);
});

test('settle: every API error, malformed answer or missing input fails', async () => {
  const runs = { [B]: [run(7, 'completed', [job(GATE_JOB, 'completed', 'success')])] };
  for (const fail of [
    (p) => p.endsWith('/git/ref/heads/main'),
    (p) => p.includes('/runs?head_sha='),
    (p) => p.includes('/jobs?'),
    (p, m) => m === 'POST',
  ]) {
    const { fetchImpl } = api({ heads: [B], runs, fail });
    await assert.rejects(settle({ ...base, fetchImpl }), /502/);
  }
  await assert.rejects(settle({ ...base, fetchImpl: api({ heads: ['nope'] }).fetchImpl }), /no commit for main/);
  await assert.rejects(settle({ ...base, repo: '', fetchImpl: api({ heads: [B] }).fetchImpl }), /missing/);
  await assert.rejects(settle({ ...base, token: '', fetchImpl: api({ heads: [B] }).fetchImpl }), /missing/);
  const short = async (url) => ({
    ok: true, status: 200,
    json: async () => url.endsWith('/git/ref/heads/main') ? { object: { sha: B } }
      : url.includes('/runs?head_sha=') ? { workflow_runs: [{ id: 7 }] }
      : { total_count: 120, jobs: [] },
  });
  await assert.rejects(settle({ ...base, fetchImpl: short }), /incomplete job list/);
});

// The wiring: the head check runs outside the production-deploy group, only a
// head that is current joins it, and every skip runs settle with the rights to
// dispatch.
const deployYml = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const jobOf = (key) => deployYml.split(/\n  (?=[a-z-]+:\n)/).find((s) => s.startsWith(`${key}:\n`)) ?? '';

test('deploy.yml asks whether the commit is main\'s head before the deploy group, and settles every skip', () => {
  assert.doesNotMatch(jobOf('head'), /concurrency/);
  assert.match(jobOf('head'), /git\/ref\/heads\/main/);
  assert.match(jobOf('deploy'), /needs: head\n/);
  assert.match(jobOf('deploy'), /if: needs\.head\.outputs\.current == 'true'\n/);
  assert.match(jobOf('deploy'), /group: production-deploy/);
  assert.match(jobOf('deploy'), /current: \$\{\{ steps\.head\.outputs\.current \}\}/);
  assert.match(jobOf('settle'), /needs: \[head, deploy\]/);
  assert.match(jobOf('settle'), /always\(\) && \(needs\.head\.outputs\.current == 'false' \|\| needs\.deploy\.outputs\.current == 'false'\)/);
  assert.match(jobOf('settle'), /actions: write/);
  assert.doesNotMatch(jobOf('settle'), /concurrency/);
  assert.match(jobOf('settle'), /run: node scripts\/deploy-head\.mjs/);
  const callers = readFileSync(new URL('../.github/workflows/site-checks.yml', import.meta.url), 'utf8')
    .split(/\n  (?=[a-z-]+:\n)/).filter((s) => /uses: \.\/\.github\/workflows\/deploy\.yml/.test(s));
  assert.equal(callers.length, 2);
  for (const c of callers) assert.match(c, /actions: write/);
});
