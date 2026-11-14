// The receipts under the home page's hero (src/lib/receipts.mjs, src/worker/receipts.mjs):
// the numbers come from GitHub's answer, a failed answer never replaces a good one, and the
// built page shows them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fetchReceipts, isValidReceipts, receiptsOrSnapshot, shapeReceipts } from '../src/lib/receipts.mjs';
import { receiptsResponse } from '../src/worker/receipts.mjs';
import { readDist, textOf } from './support/dist.mjs';

const snapshot = JSON.parse(fs.readFileSync(new URL('../src/data/receipts-snapshot.json', import.meta.url), 'utf8'));
const NOW = Date.parse('2026-11-14T19:00:00Z');
const pr = (n, repo, mergedAt) => ({ number: n, title: `Change ${n}`, html_url: `https://github.com/ourostack/${repo}/pull/${n}`, repository_url: `https://api.github.com/repos/ourostack/${repo}`, pull_request: { merged_at: mergedAt } });
const minutesAgo = (m) => new Date(NOW - m * 60000).toISOString();

// A fake GitHub search: `total` merged pull requests in the last day, spread over three repositories.
function fakeGitHub({ total = 250, status = 200 } = {}) {
  const all = Array.from({ length: total }, (_, i) => pr(i + 1, ['desk', 'ouro-ui', 'ouroboros'][i % 3], minutesAgo((i * 7) % 1400)));
  const calls = [];
  const get = async (url) => {
    const u = new URL(url);
    calls.push(u);
    if (status !== 200) return new Response('{"message":"API rate limit exceeded"}', { status });
    const q = u.searchParams.get('q');
    const perPage = Number(u.searchParams.get('per_page'));
    const page = Number(u.searchParams.get('page'));
    const count = !q.includes('merged:>=') ? 5000 : Date.parse(q.split('merged:>=')[1]) < NOW - 2 * 86400000 ? 1200 : total;
    const items = count === total ? all.slice((page - 1) * perPage, page * perPage) : all.slice(0, 1);
    return Response.json({ total_count: count, incomplete_results: false, items });
  };
  return { get, calls };
}

test('shaping: the count is GitHub\'s, repositories are counted once, and the latest come first', () => {
  const items = [pr(1, 'desk', minutesAgo(30)), pr(2, 'ouro-ui', minutesAgo(5)), pr(3, 'desk', minutesAgo(90)), pr(2, 'ouro-ui', minutesAgo(5))];
  const r = shapeReceipts({ asOf: minutesAgo(0), since: minutesAgo(1440), day: { total: 3, items }, week: 20, all: 100 });
  assert.equal(r.count, 3);
  assert.equal(r.repos, 2);
  assert.deepEqual(r.latest.map((p) => p.number), [2, 1, 3]);
  assert.deepEqual(r.latest[0], { title: 'Change 2', url: 'https://github.com/ourostack/ouro-ui/pull/2', repo: 'ouro-ui', number: 2, mergedAt: minutesAgo(5) });
  assert.ok(isValidReceipts(r));
  const search = new URL(r.search);
  assert.equal(search.origin + search.pathname, 'https://github.com/search');
  assert.equal(search.searchParams.get('q'), `org:ourostack is:pr is:merged is:public merged:>=${minutesAgo(1440)}`);
});

test('shaping: the repository count is left out unless every result came back', () => {
  const r = shapeReceipts({ asOf: minutesAgo(0), since: minutesAgo(1440), day: { total: 1500, items: [pr(1, 'desk', minutesAgo(3))] } });
  assert.equal(r.count, 1500);
  assert.equal(r.repos, null);
  assert.equal(shapeReceipts({ asOf: minutesAgo(0), since: minutesAgo(1440), day: { total: 1, items: [pr(1, 'desk', minutesAgo(3))], incomplete: true } }).repos, null);
});

test('fetching reads every page of the last day and the week and all-time counts', async () => {
  const github = fakeGitHub({ total: 250 });
  const r = await fetchReceipts({ fetch: github.get, now: NOW, token: 't' });
  assert.equal(r.count, 250);
  assert.equal(r.repos, 3);
  assert.equal(r.week, 1200);
  assert.equal(r.all, 5000);
  assert.equal(r.latest.length, 5);
  assert.equal(r.latest[0].mergedAt, minutesAgo(0));
  assert.equal(r.asOf, '2026-11-14T19:00:00Z');
  assert.equal(r.since, '2026-11-13T19:00:00Z');
  const dayPages = github.calls.filter((u) => u.searchParams.get('q').includes(r.since)).map((u) => u.searchParams.get('page'));
  assert.deepEqual(dayPages.sort(), ['1', '2', '3']);
  assert.ok(github.calls.every((u) => u.searchParams.get('q').includes('is:public')), 'Only public pull requests are asked for');
});

test('a refused or failed search falls back to the snapshot, and a bad snapshot hides the section', async () => {
  assert.ok(isValidReceipts(snapshot), 'src/data/receipts-snapshot.json is a usable answer');
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await receiptsOrSnapshot({ snapshot, fetch: fakeGitHub({ status: 403 }).get, now: NOW }), snapshot);
    assert.equal(await receiptsOrSnapshot({ snapshot, fetch: async () => { throw new Error('timed out'); }, now: NOW }), snapshot);
    assert.equal(await receiptsOrSnapshot({ snapshot, fetch: fakeGitHub({ total: 0 }).get, now: NOW }), snapshot, 'An empty day is not shown as 0');
    assert.equal(await receiptsOrSnapshot({ snapshot: { count: 0 }, fetch: fakeGitHub({ status: 429 }).get, now: NOW }), null);
  } finally {
    console.warn = warn;
  }
  let asked = false;
  assert.equal(await receiptsOrSnapshot({ snapshot, offline: true, fetch: async () => { asked = true; } }), snapshot);
  assert.equal(asked, false, 'An offline build never asks GitHub');
  const fresh = await receiptsOrSnapshot({ snapshot, fetch: fakeGitHub().get, now: NOW });
  assert.equal(fresh.count, 250);
});

// The Worker's route, with Cloudflare's cache played by a Map.
function fakeCache() {
  const store = new Map();
  return { store, match: async (key) => store.get(key)?.clone(), put: async (key, res) => { store.set(key, res.clone()); } };
}
const ask = (cache, get, now = NOW) => receiptsResponse(new Request('https://ouroboros.bot/api/receipts.json'), {}, null, { cache, fetch: get, now });

test('the Worker caches a good answer and serves it without asking GitHub again', async () => {
  const cache = fakeCache();
  const github = fakeGitHub();
  const first = await ask(cache, github.get);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).count, 250);
  const calls = github.calls.length;
  const second = await ask(cache, github.get);
  assert.equal((await second.json()).count, 250);
  assert.equal(github.calls.length, calls, 'A cached answer asks GitHub nothing');
});

test('when GitHub refuses, the Worker serves the last good answer, the build\'s, or a 503, and waits before asking again', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const cache = fakeCache();
    await ask(cache, fakeGitHub().get);
    for (const key of [...cache.store.keys()].filter((k) => k.endsWith('fresh'))) cache.store.delete(key);
    const refused = fakeGitHub({ status: 403 });
    const stale = await ask(cache, refused.get, NOW + 600000);
    assert.equal(stale.status, 200);
    assert.equal((await stale.json()).asOf, '2026-11-14T19:00:00Z', 'The last good answer keeps its own time');
    const calls = refused.calls.length;
    await ask(cache, refused.get, NOW + 610000);
    assert.equal(refused.calls.length, calls, 'After a refusal the Worker backs off');

    const empty = await ask(fakeCache(), fakeGitHub({ status: 429 }).get);
    assert.equal(empty.status, 503);
    assert.equal(empty.headers.get('cache-control'), 'no-store');

    const assets = { fetch: async () => Response.json(snapshot) };
    const built = await receiptsResponse(new Request('https://ouroboros.bot/api/receipts.json'), { ASSETS: assets }, null, { cache: fakeCache(), fetch: fakeGitHub({ status: 403 }).get, now: NOW });
    assert.equal(built.status, 200);
    assert.deepEqual(await built.json(), snapshot, 'With nothing cached, the build\'s own answer goes out');
  } finally {
    console.warn = warn;
  }
});

test('the home page shows the receipts under its hero', () => {
  const html = readDist('index.html');
  const section = html.match(/<section id="receipts"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'The receipts section is on the home page');
  assert.ok(html.indexOf('id="receipts"') < html.indexOf('id="ouroboros"'), 'It comes before Ouroboros');
  const count = Number(section.match(/data-count="(\d+)"/)[1]);
  assert.ok(count > 0);
  const text = textOf(section);
  assert.ok(text.includes(`${new Intl.NumberFormat('en-US').format(count)} pull requests merged`), 'The count is the one the section was built with');
  const prs = [...section.matchAll(/<a href="(https:\/\/github\.com\/ourostack\/[^/"]+\/pull\/\d+)" class="receipt"/g)];
  assert.ok(prs.length >= 1 && prs.length <= 5, `Shows 1 to 5 pull requests, not ${prs.length}`);
  assert.match(section, /<a href="https:\/\/github\.com\/search\?q=org%3Aourostack[^"]*"[^>]*>See every one on GitHub/);
  assert.match(section, /<time data-r="as-of" datetime="\d{4}-\d\d-\d\dT[\d:]+Z"/);
  const built = JSON.parse(readDist('api/receipts.json'));
  assert.ok(isValidReceipts(built), 'The build writes its own answer to /api/receipts.json');
  assert.equal(built.count, count, 'The page and the build\'s answer agree');
});
