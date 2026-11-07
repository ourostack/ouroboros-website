// Real-browser check that every caption reads as its own figure's: it sits
// visibly nearer the figure it captions than whatever comes next (taste
// review r19, 2026-11-07: on /lab/docs/getting-started/ the DRAMATIZATION
// caption sat 4px above the "Already running?" h2, so it read as that
// heading's label).
//
//   npm run build && node scripts/caption-proximity.mjs
//   node scripts/caption-proximity.mjs --base https://ouroboros.bot   (a live site)
//
// At 320, 390, 768, 1024, 1440 and 1920, for every visible <figcaption>, it
// fails when the gap to the next visible thing beyond the caption (text,
// media, a rule or a tinted band; scripts/lib/caption-gaps.mjs) is less than
// RATIO times the gap between the caption and its own figure, or less than
// that gap plus MIN_MARGIN px: the caption must be visibly nearer its figure. --json <file> saves every measurement.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { launchOptions, openSite, opt } from './lib/site-pages.mjs';
import { captionGaps } from './lib/caption-gaps.mjs';

const RATIO = 1.5;
const MIN_MARGIN = 8;
const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
const site = await openSite({ port: 6212, missing: '/no-such-page-captions/' });
const browser = await chromium.launch(launchOptions());
const failures = [];
const rows = [];
for (const width of WIDTHS) {
  const phone = width < 640;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone, colorScheme: 'light', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  // Every image and clip carries its own width and height, so the layout holds without the bytes.
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const c of await p.evaluate(captionGaps)) {
      const where = `${width} ${page} ${c.caption}`;
      rows.push({ width, page, ...c });
      if (c.next === null) continue;
      const need = Math.round(Math.max(c.own * RATIO, c.own + MIN_MARGIN) * 10) / 10;
      if (c.next < need) failures.push(`${where}: ${c.own}px from its figure but ${c.next}px from ${c.what} (needs ${need}px)`);
    }
  }
  await ctx.close();
}
await browser.close();
site.close();
if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(rows, null, 2));
const nexts = rows.filter((r) => r.next !== null).map((r) => r.next);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`caption-proximity: ${rows.length} captions at ${WIDTHS.join(', ')}; nearest next thing ${Math.min(...nexts)}px; own gaps ${Math.min(...rows.map((r) => r.own))}..${Math.max(...rows.map((r) => r.own))}px`);
console.log(failures.length ? `${failures.length} failure(s)` : 'caption-proximity: every caption sits nearer its own figure than what follows');
process.exit(failures.length ? 1 : 0);
