// site-checks times itself (scripts/ci-budget.mjs): its last job reports each
// job's minutes and, on a pull request, fails when the critical path is over
// budget. These hold the guard honest: it waits on every check job, those jobs
// all start at once so the longest one is the critical path, and a wait for a
// runner never counts against the budget.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BUDGET_MS, measure, summary, verdict } from '../scripts/ci-budget.mjs';

const workflow = readFileSync(new URL('../.github/workflows/site-checks.yml', import.meta.url), 'utf8');
const jobs = Object.fromEntries(
  workflow.slice(workflow.indexOf('\njobs:\n')).split(/\n  (?=[a-z-]+:\n)/).slice(1).map((block) => [block.slice(0, block.indexOf(':')), block]),
);
const needs = (block) => {
  const m = block.match(/^    needs: (?:\[([^\]]*)\]|(\S+))$/m);
  return m ? (m[1] ?? m[2]).split(',').map((s) => s.trim()) : [];
};
// Deploying and proving the tree for a deploy aren't checks; the guard doesn't wait on them.
const DEPLOY = ['proof', 'deploy-early', 'deploy'];

test('the guard waits on every check job', () => {
  const checks = Object.keys(jobs).filter((name) => name !== 'site-checks' && !DEPLOY.includes(name));
  assert.ok(checks.length >= 3, `found only ${checks.join(', ')}`);
  assert.deepEqual([...needs(jobs['site-checks'])].sort(), checks.sort(), 'site-checks must need every check job');
  assert.match(jobs['site-checks'], /node scripts\/ci-budget\.mjs/);
});

test('check jobs start at once, so the longest job is the critical path', () => {
  for (const name of Object.keys(jobs).filter((n) => n !== 'site-checks' && !DEPLOY.includes(n))) {
    assert.deepEqual(needs(jobs[name]), [], `${name} waits on another job, so the guard's critical path would miss that wait`);
  }
});

const at = (s) => new Date(Date.UTC(2026, 10, 14, 0, 0, s)).toISOString();
const job = (name, created, started, completed, conclusion = 'success') => ({
  name, status: 'completed', conclusion, created_at: at(created), started_at: at(started), completed_at: at(completed),
});

test('the critical path is the longest job timed from its own start; waiting for a runner is only wall clock', () => {
  const m = measure(
    [
      job('tests and brand audit', 0, 5, 95),
      job('page checks 1/4', 0, 240, 400), // waited 4 minutes for a runner, worked 160 s
      job('ouro check 1/6', 0, 10, 180),
      job('site-checks', 400, 405, 410),
    ],
    { runStartedAt: at(0) },
  );
  assert.equal(m.criticalPathMs, 170_000);
  assert.equal(m.longest, 'ouro check 1/6');
  assert.equal(m.wallClockMs, 400_000);
  assert.ok(!m.rows.some((r) => r.name === 'site-checks'));
});

test('skipped and unfinished jobs are not timed', () => {
  const m = measure(
    [job('tests and brand audit', 0, 5, 95), { ...job('deploy-early / deploy', 0, 30, 60), status: 'in_progress', completed_at: null }, { ...job('deploy / deploy', 0, 0, 0), conclusion: 'skipped' }],
    { runStartedAt: at(0) },
  );
  assert.deepEqual(m.rows.map((r) => r.name), ['tests and brand audit']);
});

test('over budget fails a pull request and only reports on main', () => {
  const over = { criticalPathMs: BUDGET_MS + 1000 };
  assert.deepEqual(verdict(over, { event: 'pull_request' }), { over: true, fail: true });
  assert.deepEqual(verdict(over, { event: 'push' }), { over: true, fail: false });
  assert.deepEqual(verdict(over, { event: 'workflow_dispatch' }), { over: true, fail: false });
  assert.deepEqual(verdict({ criticalPathMs: BUDGET_MS }, { event: 'pull_request' }), { over: false, fail: false });
});

test('the summary lists every timed job', () => {
  const m = measure([job('tests and brand audit', 0, 5, 95), job('ouro check 1/6', 0, 10, 180)], { runStartedAt: at(0) });
  const text = summary(m, { over: false });
  assert.match(text, /critical path 2:50 \(ouro check 1\/6\) against a 7:00 budget/);
  assert.match(text, /\| tests and brand audit \| success \| 0:05 \| 1:30 \|/);
});
