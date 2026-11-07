// Real-browser check that every "Dramatization" label looks the same and sits
// under its frame, never inside it (Ari's ruling on taste review r18,
// 2026-11-07: on /lab/ and /lab/docs/getting-started/ the label sat 3px from
// the terminal frame's bottom-left corner, elsewhere it sat under the frame,
// and the Ouro MD download page used a pill: one label style, a small caption
// set under the frame with real breathing room).
//
//   npm run build && node scripts/dramatization.mjs
//   node scripts/dramatization.mjs --base https://ouroboros.bot   (a live site)
//
// At 390 and 1440, in light and dark, it fails when
//   - a label's computed look (font, size, spacing, case, colour, weight,
//     background, border, padding, radius) differs from the first one found,
//   - a label is not inside a <figcaption>, or
//   - its caption starts less than MIN_GAP px below the bottom of everything
//     else in the figure (the frame), or overlaps it, or
//   - whatever follows the caption (text, media, a rule or a tinted band;
//     scripts/lib/caption-gaps.mjs) starts closer than SECTION_RHYTHM px
//     below it, so the caption would read as the next block's label (taste
//     review r19: 4px above the "Already running?" h2 on
//     /lab/docs/getting-started/). SECTION_RHYTHM is 2.5rem, the smallest
//     room the site leaves between a block and the next one in a section.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';
import { captionGaps } from './lib/caption-gaps.mjs';

const MIN_GAP = 10;
const SECTION_RHYTHM = 40;
const site = await openSite({ port: 6208, missing: '/no-such-page-dramatization/' });

function labels(MIN_GAP) {
  const KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'paddingTop', 'paddingLeft', 'borderRadius', 'lineHeight'];
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length || !/^\s*dramatization\s*$/i.test(el.textContent)) continue;
    if (!el.getClientRects().length || el.closest('[hidden], noscript, template')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    const look = Object.fromEntries(KEYS.map((k) => [k, s[k]]));
    const cap = el.closest('figcaption');
    const fig = cap?.closest('figure');
    let gap = null;
    if (fig) {
      let bottom = -Infinity;
      for (const child of fig.children) {
        if (child === cap || child.contains(cap)) continue;
        const r = child.getBoundingClientRect();
        if (r.height) bottom = Math.max(bottom, r.bottom);
      }
      gap = Math.round((el.getBoundingClientRect().top - bottom) * 10) / 10;
    }
    out.push({ look, inCaption: !!cap, gap, MIN_GAP, capIndex: cap ? [...document.querySelectorAll('figure figcaption')].indexOf(cap) : -1 });
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let reference = null;
let count = 0;
for (const width of [390, 1440]) {
  for (const scheme of ['light', 'dark']) {
    const phone = width < 640;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone, colorScheme: scheme, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
    for (const page of site.pages) {
      await p.goto(site.base + page, { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      const follows = await p.evaluate(captionGaps);
      for (const [i, l] of (await p.evaluate(labels, MIN_GAP)).entries()) {
        const follow = follows.find((c) => c.index === l.capIndex);
        count++;
        const where = `${width} ${scheme} ${page} label ${i + 1}`;
        const key = `${scheme}`;
        reference ??= {};
        reference[key] ??= { look: l.look, where };
        const diff = Object.keys(l.look).filter((k) => l.look[k] !== reference[key].look[k]);
        if (diff.length) failures.push(`${where}: looks different from ${reference[key].where} (${diff.map((k) => `${k} ${l.look[k]} vs ${reference[key].look[k]}`).join(', ')})`);
        if (!l.inCaption) failures.push(`${where}: not a <figcaption> under its frame`);
        else if (l.gap === null || l.gap < MIN_GAP) failures.push(`${where}: sits ${l.gap}px below its frame (needs ${MIN_GAP}px)`);
        if (follow && follow.next !== null && follow.next < SECTION_RHYTHM) failures.push(`${where}: sits ${follow.next}px above ${follow.what} (needs ${SECTION_RHYTHM}px, the section rhythm)`);
        console.log(`${where}: gap ${l.gap}px, next ${follow?.next ?? 'none'}px, ${l.look.fontFamily.split(',')[0]} ${l.look.fontSize} ${l.look.color}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
site.close();
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `${failures.length} failure(s)` : `dramatization: ${count} labels, one look, each under its frame`);
process.exit(failures.length ? 1 : 0);
