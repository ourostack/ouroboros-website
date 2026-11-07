// Real-browser check that an arrow or icon never sits alone on a line and a
// button label never wraps (taste review r17, 2026-11-07: at 390 the closing
// "→" of the docs exit links dropped onto a line of its own, and at 320 "Read
// the docs" wrapped inside its button on /lab/). Ari's ruling: an arrow or
// icon is always glued to the word before it, and a button label never wraps;
// two buttons that don't fit side by side stack full width. ouro.bot runs the
// same check (ourostack/ouro-apps-site, scripts/line-ends.mjs).
//
//   npm run build && node scripts/line-ends.mjs
//   node scripts/line-ends.mjs --base https://ouroboros.bot   (a live site)
//
// For every page, at 320, 390 and 430 wide, it fails when
//   - an arrow (→ ← ↗ ↑ ↓ and the like) or an icon (an <svg> beside text in a
//     link or button) shares no line with any word of the block around it, or
//   - a button, or a link drawn as one (a fill or a border all round, and a
//     short label), holds its label on more than one line.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

const site = await openSite({ port: 6202, missing: '/no-such-page-line-ends/' });

// Runs in the page: arrows and icons alone on a line, and wrapped buttons.
function lineEnds() {
  const ARROW = /^[←-⇿⟰-⟿➔-➿⬀-⬑›»]+$/;
  const hidden = (el) => !el.getClientRects().length || el.closest('[hidden], script, style, noscript, pre, .sr-only') || getComputedStyle(el).visibility === 'hidden';
  const sameLine = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) / 2;
  const name = (el) => `${el.tagName.toLowerCase()} "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
  // Every visible word in an element, with its rects (a word may break across lines).
  const words = (root) => {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
      if (!node.parentElement || hidden(node.parentElement)) continue;
      for (const m of node.data.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rects.length) out.push({ text: m[0], node, rects });
      }
    }
    return out;
  };
  const out = [];

  // Arrows and icons: each needs a word of its own block on its line.
  const marks = [];
  for (const w of words(document.body)) if (ARROW.test(w.text)) marks.push({ el: w.node.parentElement, rect: w.rects[0], what: w.text });
  for (const svg of document.querySelectorAll('a svg, button svg')) if (!hidden(svg) && svg.getBoundingClientRect().width) marks.push({ el: svg, rect: svg.getBoundingClientRect(), what: 'icon' });
  const blockOf = (el) => { while (el && getComputedStyle(el).display === 'inline') el = el.parentElement; return el; };
  for (const mark of marks) {
    // A connector in a diagram (the arrows between boxes on /lab/story/ and
    // /blog/stop-being-the-glue/) is a block of arrows by design, outside any
    // link or button: it has no word to be glued to.
    if (mark.what !== 'icon' && !mark.el.closest('a, button') && !words(blockOf(mark.el)).some((w) => !ARROW.test(w.text))) continue;
    // The nearest ancestor holding words other than arrows is the block it reads in.
    let block = mark.el.parentElement;
    let text = [];
    for (; block && block !== document.body; block = block.parentElement) {
      text = words(block).filter((w) => !ARROW.test(w.text));
      if (text.length) break;
    }
    if (!text.length) continue; // an icon-only control: nothing to be glued to
    if (!text.some((w) => w.rects.some((r) => sameLine(r, mark.rect)))) out.push(`${mark.what === 'icon' ? 'an icon' : `"${mark.what}"`} alone on a line in ${name(block)}`);
  }

  // Buttons and links drawn as buttons: the label stays on one line.
  for (const el of document.querySelectorAll('button, [role="button"], a')) {
    if (hidden(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline') continue;
    const filled = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    const ringed = ['Top', 'Right', 'Bottom', 'Left'].every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    if (!filled && !ringed) continue;
    const label = words(el);
    if (!label.length || label.length > 6) continue;
    const lines = [];
    for (const w of label) for (const r of w.rects) if (!lines.some((l) => sameLine(l, r))) lines.push(r);
    if (lines.length > 1) out.push(`button ${name(el)} wraps onto ${lines.length} lines`);
  }
  return [...new Set(out)];
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let views = 0;
for (const width of [320, 390, 430]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    views++;
    for (const f of await p.evaluate(lineEnds)) failures.push(`${width} ${page}: ${f}`);
  }
  await ctx.close();
}
await browser.close();
site.close();
console.log(`${site.pages.length} pages at 320, 390 and 430 (${views} views): ${failures.length} arrows or icons alone on a line, or wrapped buttons`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
