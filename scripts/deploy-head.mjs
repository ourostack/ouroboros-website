// After a deploy skips because its commit is no longer main's head: has main's
// head deployed, or is a deploy for it still coming? If neither, dispatch
// site-checks on main, which runs every check and then deploys the head.
//
// Why: GitHub keeps one pending job per concurrency group and cancels the
// older pending job when another queues, even with cancel-in-progress false.
// deploy.yml asks "is this main's head?" before the production-deploy group,
// so a commit already stale never joins it. One that goes stale while its
// deploy queues can still join, cancel the head's pending deploy and then
// skip. So every deploy that skips runs this, and a skip never leaves
// production on an old commit.
//
// Main's head is handled when one of its push or dispatch runs on main:
//   - deployed it (the "Deploy to Cloudflare Workers" step succeeded);
//   - has its site-checks gate or a deploy.yml head or deploy job unfinished
//     (it deploys itself);
//   - failed its gate (nothing deploys until a fix lands; that red run is the
//     visible failure).
// While a run is unfinished but none of those jobs is, its next job may not
// exist yet, so this waits and looks again. Otherwise (it passed and never
// deployed, or has no run) it dispatches site-checks on main. An API error, or
// a run that never settles, fails the job visibly.
//
// Usage (in Actions, with GH_TOKEN): node scripts/deploy-head.mjs

import { pathToFileURL } from 'node:url';

export const WORKFLOW_FILE = 'site-checks.yml';
export const GATE_JOB = 'site-checks';
export const DEPLOY_STEP = 'Deploy to Cloudflare Workers';
const SHA = /^[0-9a-f]{40}$/;

// Reusable-workflow jobs are named "<caller> / <job>"; deploy.yml's head job
// leads to its deploy job.
const isDeployJob = (job) => / \/ (head|deploy)$/.test(job.name ?? '');

// What to do about main's head, given its runs, each with its latest jobs.
export function decide(runs) {
  const main = (runs ?? []).filter((r) => r.head_branch === 'main' && (r.event === 'push' || r.event === 'workflow_dispatch'));
  const jobs = main.flatMap((r) => r.jobs ?? []);
  if (jobs.some((j) => (j.steps ?? []).some((s) => s.name === DEPLOY_STEP && s.conclusion === 'success'))) return { action: 'done', reason: 'it deployed' };
  const open = main.filter((r) => r.status !== 'completed');
  if (open.some((r) => !(r.jobs ?? []).length || r.jobs.some((j) => j.status !== 'completed' && (j.name === GATE_JOB || isDeployJob(j))))) return { action: 'done', reason: 'a deploy for it is still coming' };
  if (open.length) return { action: 'wait', reason: 'its run has not finished' };
  const gates = jobs.filter((j) => j.name === GATE_JOB);
  if (gates.some((j) => j.conclusion === 'success')) return { action: 'dispatch', reason: 'it passed its checks but never deployed' };
  if (gates.some((j) => j.conclusion === 'failure')) return { action: 'done', reason: 'it failed its checks, so it deploys once a fix lands' };
  return { action: 'dispatch', reason: main.length ? 'its checks never finished' : 'it has no site-checks run on main' };
}

async function api(path, token, fetchImpl, { method = 'GET', body } = {}) {
  const res = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function mainHead(repo, token, fetchImpl) {
  const head = (await api(`/repos/${repo}/git/ref/heads/main`, token, fetchImpl))?.object?.sha;
  if (!SHA.test(head ?? '')) throw new Error(`no commit for main (${head})`);
  return head;
}

export async function settle({ repo, token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), tries = 12, waitMs = 15_000, log = () => {} }) {
  if (!repo || !token) throw new Error('missing repository or token');
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(waitMs);
    const head = await mainHead(repo, token, fetchImpl);
    const runs = (await api(`/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?head_sha=${head}&branch=main&per_page=100`, token, fetchImpl))?.workflow_runs;
    if (!Array.isArray(runs)) throw new Error(`no run list for ${head}`);
    for (const run of runs) {
      const list = await api(`/repos/${repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`, token, fetchImpl);
      if (!Array.isArray(list?.jobs) || list.jobs.length < (list.total_count ?? Infinity)) throw new Error(`incomplete job list for run ${run.id}`);
      run.jobs = list.jobs;
    }
    // A head that moved on meanwhile is judged afresh: its own deploy is coming.
    if ((await mainHead(repo, token, fetchImpl)) !== head) { log(`main moved past ${head}; looking again`); continue; }
    const verdict = { ...decide(runs), head };
    if (verdict.action === 'wait') { log(`main's head ${head}: ${verdict.reason}; looking again`); continue; }
    if (verdict.action === 'dispatch') await api(`/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, token, fetchImpl, { method: 'POST', body: { ref: 'main' } });
    return verdict;
  }
  throw new Error(`main's head never settled after ${tries} looks`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const v = await settle({ repo: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN, log: (m) => console.log(m) });
    const msg = `main's head ${v.head}: ${v.reason}`;
    console.log(v.action === 'dispatch' ? `::warning::${msg}; dispatched site-checks on main to deploy it.` : `::notice::${msg}.`);
  } catch (err) {
    console.log(`::error::could not confirm main's head deploys: ${err?.message ?? err}`);
    process.exit(1);
  }
}
