// The page checks that `npm run check:all` runs, and how site-checks splits
// them across runners. Kept apart from scripts/check-all.mjs so the tests can
// import it without starting a server.
//
// SECONDS is each check's time in site-checks on ubuntu-latest with CHECK_JOBS=2
// (pull request #132's run 43542742330, 2026-11-14). shard() puts the longest
// check into the emptiest shard, so shards balance by measured time, not by
// count. When a check gets much slower, or a new one lands, record its time
// from the "Page checks" table in the run's summary.

export const SECONDS = {
  seams: 88, hero: 42, text: 40, swipe: 37, captions: 33, drama: 32, grid: 31,
  hit: 24, headings: 21, cta: 18, gap: 17, ends: 15, h1: 15, column: 14,
  spaces: 13, buttons: 12, swap: 10, menu: 7, fallback: 4,
};

export const CHECKS = [
  'text', 'hero', 'column', 'fallback', 'seams', 'menu', 'hit', 'h1', 'gap',
  'spaces', 'ends', 'swap', 'swipe', 'headings', 'drama', 'buttons', 'grid',
  'captions', 'cta',
];

// Splits checks into n shards by SECONDS: longest first, each into the
// emptiest shard (the lower index on a tie), so the split is the same on
// every runner.
export function shard(checks, n) {
  const shards = Array.from({ length: n }, () => ({ checks: [], seconds: 0 }));
  const longestFirst = [...checks].sort((a, b) => (SECONDS[b] ?? 0) - (SECONDS[a] ?? 0) || checks.indexOf(a) - checks.indexOf(b));
  for (const name of longestFirst) {
    const emptiest = shards.reduce((best, s) => (s.seconds < best.seconds ? s : best));
    emptiest.checks.push(name);
    emptiest.seconds += SECONDS[name] ?? 0;
  }
  return shards.map((s) => ({ ...s, checks: checks.filter((c) => s.checks.includes(c)) }));
}

// "2/4" → { index: 1, count: 4 }; throws on anything else.
export function parseShard(value) {
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  const [k, n] = match ? [Number(match[1]), Number(match[2])] : [0, 0];
  if (!match || n < 1 || k < 1 || k > n) throw new Error(`--shard wants k/n with 1 <= k <= n, got "${value}"`);
  return { index: k - 1, count: n };
}
