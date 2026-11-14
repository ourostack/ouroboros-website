// GET /api/receipts.json: the home page's receipts, fresh from GitHub
// (src/lib/receipts.mjs), for the page's script to swap in after load.
//
// Each Cloudflare location keeps the answer for FRESH_SECONDS in its cache, so a
// location runs its seven or so searches at most once in that time, inside search's
// rate limit (10 requests a minute without a token, 30 with one). It also keeps
// the last good answer for a week: when GitHub refuses (403 or 429 once the
// limit is spent) or times out, that answer goes out with its own time; with none,
// the build's own answer (the static dist/api/receipts.json) does, and failing
// that a 503 tells the page to keep what it has. After a failure the Worker
// waits BACKOFF_SECONDS before asking GitHub again.
//
// A GITHUB_TOKEN secret raises the limit; set it with
//   npx wrangler secret put GITHUB_TOKEN -c wrangler-worker.jsonc
// using a fine-grained token with read access to public repositories only.
// The search asks only for public pull requests either way.

import { fetchReceipts, isValidReceipts } from '../lib/receipts.mjs';

export const RECEIPTS_PATH = '/api/receipts.json';
export const FRESH_SECONDS = 120;
const LAST_GOOD_SECONDS = 7 * 24 * 3600;
const BACKOFF_SECONDS = 60;
const BACKOFF_KEY = 'https://ouroboros.bot/api/receipts.json?cache=backoff';
const FRESH_KEY = 'https://ouroboros.bot/api/receipts.json?cache=fresh';
const LAST_GOOD_KEY = 'https://ouroboros.bot/api/receipts.json?cache=last-good';

const json = (body, status, maxAge) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    'access-control-allow-origin': '*',
  },
});

export async function receiptsResponse(request, env = {}, ctx, { cache = globalThis.caches?.default, fetch: get = fetch, now = Date.now() } = {}) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  const later = (promise) => (ctx?.waitUntil ? ctx.waitUntil(promise) : promise);

  const cached = cache && (await cache.match(FRESH_KEY));
  if (cached) return json(await cached.json(), 200, 60);
  const lastGood = async () => {
    const hit = cache && (await cache.match(LAST_GOOD_KEY));
    if (hit) return json(await hit.json(), 200, 30);
    // The build's own answer (src/pages/api/receipts.json.ts), the floor under every other.
    const built = await env.ASSETS?.fetch(request).catch(() => null);
    const body = built?.ok ? await built.json().catch(() => null) : null;
    return isValidReceipts(body) ? json(body, 200, 30) : json({ error: 'GitHub is not answering' }, 503);
  };
  // After a failure, wait before asking GitHub again, so a spent rate limit isn't spent further.
  if (cache && (await cache.match(BACKOFF_KEY))) return lastGood();

  try {
    const receipts = await fetchReceipts({ fetch: get, token: env.GITHUB_TOKEN, now });
    if (!isValidReceipts(receipts)) throw new Error('GitHub answered with nothing to show');
    if (cache) {
      later(cache.put(FRESH_KEY, json(receipts, 200, FRESH_SECONDS)));
      later(cache.put(LAST_GOOD_KEY, json(receipts, 200, LAST_GOOD_SECONDS)));
    }
    return json(receipts, 200, 60);
  } catch (error) {
    console.warn(`[receipts] ${error?.message ?? error}`);
    if (cache) later(cache.put(BACKOFF_KEY, json({ backoff: true }, 200, BACKOFF_SECONDS)));
    return lastGood();
  }
}
