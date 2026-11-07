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
// Then, on every page that has a label, at every width from 320 to 1920
// (LINE_WIDTHS) in light and dark, it fails when a label is not a
// block-level box or when anything else (caption text, a link, an icon)
// shares its line box (Ari's ruling on taste review r20: on /butler/ and
// /ouro-md/download/ at desktop widths a flex caption set "DRAMATIZATION
// Written from the replies..." on one line; the label sits on its own line).
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';
import { captionGaps } from './lib/caption-gaps.mjs';

const MIN_GAP = 10;
const LINE_WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];
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

// Runs in the page: for each label, its display and everything else in its
// figcaption whose rendered box shares the label's line.
function lineShares() {
  const out = [];
  for (const el of document.querySelectorAll('figcaption *')) {
    if (el.children.length || !/^\s*dramatization\s*$/i.test(el.textContent) || !el.getClientRects().length) continue;
    const cap = el.closest('figcaption');
    const label = el.getBoundingClientRect();
    const sharing = [];
    const walker = document.createTreeWalker(cap, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (el.contains(node) || !node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (!r.width || !r.height) continue;
        const overlap = Math.min(r.bottom, label.bottom) - Math.max(r.top, label.top);
        if (overlap > 1) { sharing.push(node.textContent.trim().slice(0, 40)); break; }
      }
    }
    for (const other of cap.querySelectorAll('img, svg, picture, video')) {
      const r = other.getBoundingClientRect();
      if (r.width && Math.min(r.bottom, label.bottom) - Math.max(r.top, label.top) > 1) sharing.push(`<${other.tagName.toLowerCase()}>`);
    }
    const parent = getComputedStyle(el.parentElement);
    // A block inside a flex row or a grid can still sit beside its neighbours.
    const rowParent = (/flex/.test(parent.display) && parent.flexDirection.startsWith('row')) || /grid/.test(parent.display);
    out.push({ display: getComputedStyle(el).display, rowParent: rowParent ? `${parent.display} ${parent.flexDirection}` : '', sharing });
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let reference = null;
let count = 0;
const seenOn = [];
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
        seenOn.push(page);
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
// The label's own line, at every width, on every page that has one.
const labelPages = [...new Set(seenOn)];
let lines = 0;
for (const width of LINE_WIDTHS) {
  for (const scheme of ['light', 'dark']) {
    const phone = width < 640;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone, colorScheme: scheme, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
    for (const page of labelPages) {
      await p.goto(site.base + page, { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      for (const [i, l] of (await p.evaluate(lineShares)).entries()) {
        lines++;
        const where = `${width} ${scheme} ${page} label ${i + 1}`;
        if (!/^(block|flex|grid|list-item|table|flow-root)$/.test(l.display)) failures.push(`${where}: label is display ${l.display}; it must be a block on a line of its own`);
        if (l.rowParent) failures.push(`${where}: label sits in a ${l.rowParent} caption, so it can share a row; the caption must flow as blocks`);
        if (l.sharing.length) failures.push(`${where}: shares its line with ${l.sharing.map((t) => JSON.stringify(t)).join(', ')}`);
      }
    }
    await ctx.close();
  }
}
console.log(`dramatization: ${lines} label lines checked at ${LINE_WIDTHS.join(', ')} on ${labelPages.length} pages`);
await browser.close();
site.close();
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `${failures.length} failure(s)` : `dramatization: ${count} labels, one look, each under its frame`);
process.exit(failures.length ? 1 : 0);
