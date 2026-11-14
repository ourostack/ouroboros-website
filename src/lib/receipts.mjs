// The receipts under the home page's hero: how many pull requests were merged
// across the ourostack GitHub org in the last 24 hours, in how many
// repositories, and the latest few, each a link to the pull request. Every
// number comes from GitHub's search API at the moment it was asked; nothing is
// typed in.
//
// One shape for every reader: the build renders it into the page
// (src/pages/index.astro), the Worker serves it fresh at /api/receipts.json
// (src/worker/index.ts), and the page's script swaps it in. When GitHub can't
// be reached, the build uses src/data/receipts-snapshot.json, the last answer
// it saved (`node scripts/refresh-receipts.mjs`), with that answer's own time.
//
// Only public pull requests are counted (is:public), so a token with more
// access can never put a private title on the page.

export const ORG = 'ourostack';
export const WINDOW_HOURS = 24;
export const LATEST = 5;
const API = 'https://api.github.com/search/issues';
const PER_PAGE = 100;
// GitHub search returns at most 1,000 results for one query.
const SEARCH_CAP = 1000;

export const queryFor = (since) => `org:${ORG} is:pr is:merged is:public${since ? ` merged:>=${since}` : ''}`;

/** The same search on github.com, for anyone who wants to check. */
export const searchUrlFor = (since) => `https://github.com/search?${new URLSearchParams({ q: queryFor(since), type: 'pullrequests', s: 'updated', o: 'desc' })}`;

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const repoOf = (item) => (item.repository_url ?? '').split('/').pop() || null;

/**
 * Shapes GitHub's answers into the receipts.
 * day: { total, items } for the last 24 hours (every page fetched, or as many as GitHub returns);
 * week and all: total counts, or null when unknown.
 */
export function shapeReceipts({ asOf, since, day, week = null, all = null }) {
  const seen = new Set();
  const items = (day.items ?? []).filter((item) => item?.pull_request?.merged_at && !seen.has(item.html_url) && seen.add(item.html_url));
  // The repository count is exact only when every result came back.
  const complete = items.length >= day.total && !day.incomplete;
  const repos = complete ? new Set(items.map(repoOf).filter(Boolean)).size : null;
  const latest = items
    .slice()
    .sort((a, b) => Date.parse(b.pull_request.merged_at) - Date.parse(a.pull_request.merged_at))
    .slice(0, LATEST)
    .map((item) => ({ title: item.title.trim(), url: item.html_url, repo: repoOf(item), number: item.number, mergedAt: item.pull_request.merged_at }));
  return { asOf, since, count: day.total, repos, week, all, latest, search: searchUrlFor(since) };
}

/** Receipts worth showing: a real count, a list to back it, and a time. Anything else falls back. */
export function isValidReceipts(r) {
  return Boolean(
    r &&
      Number.isInteger(r.count) && r.count > 0 &&
      Array.isArray(r.latest) && r.latest.length > 0 &&
      r.latest.every((pr) => pr.title && /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(pr.url) && pr.repo && !Number.isNaN(Date.parse(pr.mergedAt))) &&
      !Number.isNaN(Date.parse(r.asOf)) &&
      !Number.isNaN(Date.parse(r.since)) &&
      (r.repos === null || (Number.isInteger(r.repos) && r.repos > 0)) &&
      (r.week === null || (Number.isInteger(r.week) && r.week >= r.count)) &&
      (r.all === null || (Number.isInteger(r.all) && r.all >= (r.week ?? r.count)))
  );
}

/**
 * Asks GitHub. Throws on any failed request (a 403 or 429 when the rate limit
 * is spent, a timeout), so the caller keeps what it already has.
 */
export async function fetchReceipts({ fetch: get = fetch, token, now = Date.now(), timeoutMs = 8000 } = {}) {
  const since = iso(now - WINDOW_HOURS * 3600 * 1000);
  const weekSince = iso(now - 7 * 24 * 3600 * 1000);
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'ouroboros.bot receipts', 'x-github-api-version': '2022-11-28' };
  if (token) headers.authorization = `Bearer ${token}`;
  const search = async (q, page, perPage) => {
    const params = new URLSearchParams({ q, per_page: String(perPage), page: String(page), sort: 'updated', order: 'desc' });
    const res = await get(`${API}?${params}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`GitHub search answered ${res.status}`);
    const body = await res.json();
    if (!Number.isInteger(body.total_count) || !Array.isArray(body.items)) throw new Error('GitHub search answered without results');
    return body;
  };
  const [first, week, all] = await Promise.all([
    search(queryFor(since), 1, PER_PAGE),
    search(queryFor(weekSince), 1, 1),
    search(queryFor(), 1, 1),
  ]);
  const pages = Math.ceil(Math.min(first.total_count, SEARCH_CAP) / PER_PAGE);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => search(queryFor(since), i + 2, PER_PAGE)));
  const items = [first, ...rest].flatMap((body) => body.items);
  const incomplete = [first, ...rest].some((body) => body.incomplete_results);
  return shapeReceipts({ asOf: iso(now), since, day: { total: first.total_count, items, incomplete }, week: week.total_count, all: all.total_count });
}

/**
 * What the build renders: GitHub's answer now, or else the saved snapshot with
 * its own time, or else null, and the page leaves the section out. Never throws.
 */
export async function receiptsOrSnapshot({ snapshot, offline = false, ...options } = {}) {
  if (!offline) {
    try {
      const fresh = await fetchReceipts(options);
      if (isValidReceipts(fresh)) return fresh;
      console.warn('[receipts] GitHub answered with nothing to show; using the snapshot');
    } catch (error) {
      console.warn(`[receipts] ${error.message}; using the snapshot`);
    }
  }
  return isValidReceipts(snapshot) ? snapshot : null;
}

const pt = (options) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ...options });

/** "Nov 14, 10:55 AM PST" (or "10:55 AM PST" on the same day as `today`), in Pacific time, for the page without its script. */
export function formatPacific(at, today) {
  const sameDay = today && pt({ dateStyle: 'short' }).format(new Date(at)) === pt({ dateStyle: 'short' }).format(new Date(today));
  return pt({ ...(sameDay ? {} : { month: 'short', day: 'numeric' }), hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(at));
}

/** "just now", "14 min ago", "3 hr ago", "2 days ago". */
export function ago(at, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(at)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export const formatCount = (n) => new Intl.NumberFormat('en-US').format(n);
