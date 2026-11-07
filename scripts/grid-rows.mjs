// Real-browser check that a grid of stats or numbers never leaves an empty
// cell in a row (taste review r18, 2026-11-07: on phones the model-review
// stats put three numbers in two columns, leaving "59 FETCHES" beside an
// empty cell on all four review pages). Ari's ruling: three in a row, one
// column, or a full-width last item, whichever reads best at each width.
//
//   npm run build && node scripts/grid-rows.mjs
//   node scripts/grid-rows.mjs --base https://ouroboros.bot   (a live site)
//   node scripts/grid-rows.mjs --all     (report every grid, not only stats)
//
// A stat grid is a CSS grid of two or more columns in which at least two
// items, and at least half of them, lead with a number ("59 FETCHES"); a
// verdict or label may share the grid. At 320, 390, 430,
// 768, 1024, 1440 and 1920 it fails when any row of a stat grid holds fewer
// cells than the grid has columns. --all prints the same for every grid,
// for a person to sweep.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { args, launchOptions, openSite } from './lib/site-pages.mjs';

const all = args.includes('--all');
const site = await openSite({ port: 6210, missing: '/no-such-page-grid-rows/' });

function grids(all) {
  const out = [];
  for (const g of document.querySelectorAll('body *')) {
    const s = getComputedStyle(g);
    if (!/grid/.test(s.display) || !g.getClientRects().length) continue;
    const cols = s.gridTemplateColumns.split(/\s+/).filter((x) => /px$/.test(x)).length;
    const items = [...g.children].filter((c) => c.getClientRects().length && getComputedStyle(c).position !== 'absolute');
    if (cols < 2 || items.length < 2) continue;
    const numeric = items.filter((c) => /^\s*[\d$€£][\d.,%kKmM+]*(\s|$)/.test(c.innerText)).length;
    const stat = numeric >= 2 && numeric * 2 >= items.length;
    if (!stat && !all) continue;
    const rows = new Map();
    for (const c of items) {
      const top = Math.round(c.getBoundingClientRect().top);
      const span = getComputedStyle(c).gridColumnEnd.match(/span (\d+)/)?.[1];
      const width = span ? Number(span) : Math.max(1, Math.round(c.getBoundingClientRect().width / (g.getBoundingClientRect().width / cols)));
      rows.set(top, (rows.get(top) ?? 0) + Math.min(cols, width));
    }
    const short = [...rows.values()].filter((n) => n < cols);
    if (short.length) out.push({ stat, text: g.innerText.replace(/\s+/g, ' ').trim().slice(0, 70), cols, rows: [...rows.values()].join('/') });
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
for (const width of [320, 390, 430, 768, 1024, 1440, 1920]) {
  const phone = width < 640;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    for (const g of await p.evaluate(grids, all)) {
      const line = `${width} ${page}: ${g.cols} columns, rows ${g.rows}: "${g.text}"`;
      if (g.stat) failures.push(line);
      else console.log(`note ${line}`);
    }
  }
  await ctx.close();
}
await browser.close();
site.close();
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `${failures.length} stat grid row(s) with an empty cell` : 'grid-rows: no stat grid leaves an empty cell');
process.exit(failures.length ? 1 : 0);
