// How long did this site-checks run take, and is its work within budget?
//
// Run by the site-checks job, the last gate, which needs every check job. It
// writes each job's wait for a runner and its work to the step summary, then
// two numbers:
//   - the critical path: the longest job, timed from its own start, so a wait
//     for a runner doesn't count. Every check job starts at once (no `needs`;
//     tests/ci-budget.test.mjs holds that), so the longest job is the path.
//   - the wall clock: from the run's start to the last job's finish, queueing
//     included. Reported, never a reason to fail.
// On a pull request it exits 1 when the critical path is over BUDGET_MS. On
// main it only reports, and an over-budget run opens or updates one issue.
// Ratchet BUDGET_MS down as the median falls; never raise it to pass.
//
// Usage (in Actions, with GH_TOKEN): node scripts/ci-budget.mjs

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const BUDGET_MS = 7 * 60 * 1000;
export const GUARD = 'site-checks';

const ms = (a, b) => Date.parse(b) - Date.parse(a);
export const minutes = (t) => {
  const s = Math.round(t / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// jobs: the Actions API's jobs for this run attempt. Every job the guard needs
// has finished; one still running (a deploy on main) isn't timed.
export function measure(jobs, { runStartedAt }) {
  const rows = jobs
    .filter((j) => j.name !== GUARD && j.status === 'completed' && j.started_at && j.completed_at && j.conclusion !== 'skipped')
    .map((j) => ({ name: j.name, conclusion: j.conclusion, waitMs: ms(j.created_at, j.started_at), workMs: ms(j.started_at, j.completed_at), end: j.completed_at }))
    .sort((a, b) => b.workMs - a.workMs);
  if (!rows.length) return null;
  const last = rows.reduce((m, r) => (Date.parse(r.end) > Date.parse(m) ? r.end : m), rows[0].end);
  return { rows, criticalPathMs: rows[0].workMs, longest: rows[0].name, wallClockMs: ms(runStartedAt, last) };
}

export function verdict(m, { event, budgetMs = BUDGET_MS }) {
  const over = m.criticalPathMs > budgetMs;
  return { over, fail: over && event === 'pull_request' };
}

export function summary(m, { budgetMs = BUDGET_MS, over }) {
  return [
    `### Time: critical path ${minutes(m.criticalPathMs)} (${m.longest}) against a ${minutes(budgetMs)} budget${over ? ', over' : ''}`,
    `Wall clock from the run's start to the last job's finish, queueing included: ${minutes(m.wallClockMs)}.`,
    '',
    '| job | result | waited | worked |',
    '| --- | --- | --- | --- |',
    ...m.rows.map((r) => `| ${r.name} | ${r.conclusion} | ${minutes(r.waitMs)} | ${minutes(r.workMs)} |`),
    '',
  ].join('\n');
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: 'application/vnd.github+json', ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status}`);
  return res.json();
}

const TITLE = 'site-checks is over its time budget on main';

async function track(repo, text) {
  const open = await api(`search/issues?q=${encodeURIComponent(`repo:${repo} is:issue is:open in:title "${TITLE}"`)}`);
  const issue = open.items?.find((i) => i.title === TITLE);
  const body = `${text}\n${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  if (issue) await api(`repos/${repo}/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  else await api(`repos/${repo}/issues`, { method: 'POST', body: JSON.stringify({ title: TITLE, body, assignees: [process.env.BUDGET_OWNER].filter(Boolean) }) });
}

async function main() {
  const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt, GITHUB_EVENT_NAME: event } = process.env;
  const write = (text) => (process.env.GITHUB_STEP_SUMMARY ? appendFileSync(process.env.GITHUB_STEP_SUMMARY, text) : process.stdout.write(text));
  let m;
  try {
    const runAttempt = await api(`repos/${repo}/actions/runs/${run}/attempts/${attempt}`);
    const jobs = [];
    for (let page = 1; ; page++) {
      const batch = (await api(`repos/${repo}/actions/runs/${run}/attempts/${attempt}/jobs?per_page=100&page=${page}`)).jobs;
      jobs.push(...batch);
      if (batch.length < 100) break;
    }
    m = measure(jobs, { runStartedAt: runAttempt.run_started_at });
  } catch (err) {
    // The budget times the work; it isn't a gate on what the work proved, so a
    // GitHub API failure is reported, not turned into a red check.
    console.log(`::warning::Couldn't time this run: ${err.message}`);
    return;
  }
  if (!m) return console.log('::warning::No finished jobs to time.');
  const v = verdict(m, { event });
  const text = summary(m, { over: v.over });
  write(text);
  if (process.env.GITHUB_STEP_SUMMARY) console.log(text);
  if (v.over && event !== 'pull_request') {
    console.log(`::warning::Critical path ${minutes(m.criticalPathMs)} is over the ${minutes(BUDGET_MS)} budget.`);
    if (process.env.GITHUB_REF === 'refs/heads/main') await track(repo, text).catch((err) => console.log(`::warning::Couldn't record the overrun: ${err.message}`));
  }
  if (v.fail) {
    console.log(`::error::Critical path ${minutes(m.criticalPathMs)} (${m.longest}) is over the ${minutes(BUDGET_MS)} budget. Make it faster; don't raise the budget.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
