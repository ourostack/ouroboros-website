// Did this commit's exact tree already pass site-checks on its own pull request?
//
// A squash merge of an up-to-date pull request makes a commit whose tree is the
// one the pull request's run checked out (refs/pull/N/merge), workflow files
// included, so that run already proved it. site-checks.yml uses the answer to
// deploy a push to main at once instead of after main's own run, which still
// runs everything. Every gap fails closed: "tested=false" means deploy waits for
// main's run to pass.
//
// Trusts a run only when all of these hold:
//   - it uploaded the artifact tested-tree-<this commit's tree>;
//   - it is site-checks.yml, on a pull_request event, from this repository (not a fork);
//   - its head is the head of the pull request merged as this commit;
//   - it completed with success and finished within MAX_AGE_MS.
//
// Usage (in Actions, with GH_TOKEN): node scripts/tested-tree.mjs
// Writes tested=true|false and run=<id> to $GITHUB_OUTPUT and never exits non-zero.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const WORKFLOW = '.github/workflows/site-checks.yml';
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const artifactName = (tree) => `tested-tree-${tree}`;

// Why a run can't stand in for main's, or null when it can.
export function reject(run, { repo, pr, now = Date.now(), maxAgeMs = MAX_AGE_MS }) {
  if (!run) return 'no run';
  if (run.path !== WORKFLOW) return `workflow is ${run.path}`;
  if (run.event !== 'pull_request') return `event is ${run.event}`;
  if (run.head_repository?.full_name !== repo) return `head repository is ${run.head_repository?.full_name}`;
  if (pr?.head?.repo?.full_name !== repo) return `pull request is from ${pr?.head?.repo?.full_name}`;
  if (run.head_sha !== pr.head.sha) return `run head ${run.head_sha} is not the pull request's head ${pr.head.sha}`;
  if (run.status !== 'completed') return `status is ${run.status}`;
  if (run.conclusion !== 'success') return `conclusion is ${run.conclusion}`;
  const age = now - Date.parse(run.updated_at);
  if (!(age >= 0 && age <= maxAgeMs)) return `finished ${Math.round(age / 60000)} minutes ago`;
  return null;
}

// The pull request this commit is the squash or merge commit of, or null.
export function mergedPull(pulls, sha) {
  const hits = (pulls ?? []).filter((p) => p.merge_commit_sha === sha && p.merged_at && p.base?.ref === 'main');
  return hits.length === 1 ? hits[0] : null;
}

async function api(path, token, fetchImpl) {
  const res = await fetchImpl(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

// Polls while a candidate run is still finishing (the merge can land a few
// seconds before its run completes), at most waitMs.
export async function prove({ repo, sha, token, fetchImpl = fetch, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), waitMs = 120_000, pollMs = 15_000, log = () => {} }) {
  if (!repo || !/^[0-9a-f]{40}$/.test(sha ?? '') || !token) return { tested: false, reason: 'missing repository, commit or token' };
  const tree = (await api(`/repos/${repo}/git/commits/${sha}`, token, fetchImpl)).tree?.sha;
  if (!/^[0-9a-f]{40}$/.test(tree ?? '')) return { tested: false, reason: 'no tree for the commit' };
  const pr = mergedPull(await api(`/repos/${repo}/commits/${sha}/pulls`, token, fetchImpl), sha);
  if (!pr) return { tested: false, reason: 'not the merge of exactly one pull request into main' };
  const name = artifactName(tree);
  const started = now();
  for (;;) {
    const { artifacts = [] } = await api(`/repos/${repo}/actions/artifacts?name=${name}&per_page=100`, token, fetchImpl);
    const ids = [...new Set(artifacts.filter((a) => a.name === name && !a.expired).map((a) => a.workflow_run?.id).filter(Boolean))];
    let pending = false;
    for (const id of ids) {
      const run = await api(`/repos/${repo}/actions/runs/${id}`, token, fetchImpl);
      const why = reject(run, { repo, pr, now: now() });
      if (!why) return { tested: true, run: id, tree, pr: pr.number };
      log(`run ${id}: ${why}`);
      if (run.status !== 'completed' && !reject({ ...run, status: 'completed', conclusion: 'success', updated_at: new Date(now()).toISOString() }, { repo, pr, now: now() })) pending = true;
    }
    if (!pending || now() - started >= waitMs) return { tested: false, reason: ids.length ? 'no run qualifies' : `no ${name} artifact`, tree, pr: pr.number };
    await sleep(pollMs);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const out = (k, v) => { console.log(`${k}=${v}`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
  let result;
  try {
    result = await prove({ repo: process.env.GITHUB_REPOSITORY, sha: process.env.GITHUB_SHA, token: process.env.GH_TOKEN, log: (m) => console.log(m) });
  } catch (err) {
    result = { tested: false, reason: String(err?.message ?? err) };
  }
  console.log(result.tested ? `tree ${result.tree} passed site-checks run ${result.run} on pull request #${result.pr}` : `not proven (${result.reason}); deploy waits for main's checks`);
  out('tested', result.tested ? 'true' : 'false');
  out('run', result.run ?? '');
}
