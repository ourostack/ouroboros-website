// Real-browser check that no link or control loses a space between its words
// (taste review r17, 2026-11-07: ouro.bot/apps/ouro-md/ read "Ouro MD
// onouroboros.bot→" and the home page read "spoonjoy.app↗"). A flex or
// inline-flex box turns each run of its text into its own flex item and drops
// the spaces around them, so a link whose host name sits in a <span> lost the
// space beside it. ouro.bot runs the same check (ourostack/ouro-apps-site,
// scripts/link-spaces.mjs); keep the two in step.
//
//   npm run build && node scripts/link-spaces.mjs
//   node scripts/link-spaces.mjs --base https://ouroboros.bot   (a live site)
//
// For every page, at 390 and 1440 wide, every visible link, button, summary
// and label, and every flex or grid box with text of its own, is read twice:
// its source text (whitespace between words, as the DOM holds it) and its
// rendered text (a space wherever two words on one line have room between
// them, a line break where they don't share a line). Any two words that have
// whitespace between them in the source but touch on screen fail the check.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

const site = await openSite({ port: 6201, missing: '/no-such-page-link-spaces/' });

// Runs in the page: every place where a space in the source is lost on screen.
function lostSpaces() {
  const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
  const boxes = new Set(document.querySelectorAll('a, button, summary, label, [role="button"], [role="link"]'));
  for (const el of document.body.querySelectorAll('*')) if (/flex|grid/.test(getComputedStyle(el).display) && own(el)) boxes.add(el);
  const out = [];
  for (const el of boxes) {
    if (!el.getClientRects().length || el.closest('[hidden], [aria-hidden="true"], script, style, noscript')) continue;
    const words = [];
    let space = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
      for (const m of node.data.matchAll(/\s+|\S+/g)) {
        if (/^\s/.test(m[0])) { space = true; continue; }
        const range = document.createRange();
        range.setStart(node, m.index); range.setEnd(node, m.index + 1);
        const first = range.getClientRects()[0];
        range.setStart(node, m.index + m[0].length - 1); range.setEnd(node, m.index + m[0].length);
        const rects = range.getClientRects();
        const last = rects[rects.length - 1];
        if (!first || !last || !first.width) continue;
        words.push({ text: m[0], first, last, space });
        space = false;
      }
    }
    let rendered = words[0]?.text ?? '';
    let bad = false;
    for (let i = 1; i < words.length; i++) {
      const a = words[i - 1].last, b = words[i].first;
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const sameLine = overlap > Math.min(a.height, b.height) / 2;
      const gap = b.left - a.right;
      if (sameLine && words[i].space && gap < 1.5) bad = true;
      rendered += (!sameLine ? '\n' : gap >= 1.5 ? ' ' : '') + words[i].text;
    }
    if (bad) {
      const source = words.map((w, i) => (i && w.space ? ' ' : '') + w.text).join('');
      out.push({ el: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`, source, rendered: rendered.replace(/\n/g, ' / ') });
    }
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let views = 0;
for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    views++;
    for (const f of await p.evaluate(lostSpaces)) failures.push(`${width} ${page} ${f.el}: source "${f.source}" renders "${f.rendered}"`);
  }
  await ctx.close();
}
await browser.close();
site.close();
console.log(`${site.pages.length} pages at 390 and 1440 (${views} views): ${failures.length} lost spaces`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
