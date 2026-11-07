// Real-browser check of how every heading (h1 to h4) wraps, at every width
// from a small phone to a wide desktop (taste review r18, 2026-11-07: the
// half-width display headings broke one word per line on desktop, "One /
// command. / A / conversation. / Hatched." on /lab/ at 1024, "A few /
// commands, / then / a dialog." on /ouro-hx/, "Ouro / MD" on /apps/). Ari's
// ruling extends round 18's h1 rule to every heading at every width:
//   - no line holds a single word unless that word is a whole clause or
//     sentence ("Hatched." may stand alone after "A conversation."; "A" may
//     not), and
//   - compound terms and product names never break ("Ouro MD", "agent
//     harness", "Ouro HX"), nor does any word break inside itself (round 19:
//     "X- / ray").
// It also fails when a heading runs past its own box or into the screen's
// 16px edge. h1-lines.mjs still owns the phone clause rule for h1s.
//
//   npm run build && node scripts/heading-lines.mjs
//   node scripts/heading-lines.mjs --base https://ouroboros.bot   (a live site)
//   node scripts/heading-lines.mjs --print                        (every heading's lines)
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { args, launchOptions, openSite, opt } from './lib/site-pages.mjs';

const WIDTHS = opt('--widths')?.split(',').map(Number) ?? [320, 390, 430, 768, 1024, 1440, 1920];
const print = args.includes('--print');
const site = await openSite({ port: 6207, missing: '/no-such-page-heading-lines/' });

// Compound terms that never break across lines in a heading.
export const TERMS = ['agent harness', 'agent experience', 'Ouro MD', 'Ouro HX', 'Ouro UI', 'Ouro AX', 'Claude Code', 'GitHub Copilot', 'Copilot CLI', 'model reviews', 'Ouro Feel'];

// Runs in the page: each visible heading's words grouped into the lines they land on.
function headings(TERMS) {
  const out = [];
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const bare = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  const hidden = (el) => !el.getClientRects().length || el.closest('[hidden], .sr-only, [aria-hidden="true"]') || getComputedStyle(el).visibility === 'hidden';
  for (const h of document.querySelectorAll('h1, h2, h3, h4')) {
    if (hidden(h)) continue;
    const box = h.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    const rows = [];
    const broken = [];
    let overflow = false;
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
      if (!node.parentElement || hidden(node.parentElement)) continue;
      for (const m of node.data.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (!rects.length) continue;
        const tops = new Set(rects.map((r) => Math.round(r.top / (rects[0].height / 2))));
        if (tops.size > 1) broken.push(m[0]);
        const r = rects[0];
        for (const x of rects) if (x.right > Math.min(box.right, innerWidth - 16) + 0.5) overflow = true;
        const clause = node.parentElement.closest('.t-clause, h1 > .block, h2 > .block, h3 > .block, h4 > .block');
        let row = rows.find((x) => Math.abs(x.top - r.top) < r.height / 2);
        if (!row) rows.push((row = { top: r.top, words: [], clauses: new Set() }));
        row.words.push(m[0]);
        if (clause) row.clauses.add(clause);
      }
    }
    if (!rows.length) continue;
    rows.sort((a, b) => a.top - b.top);
    const lone = [];
    rows.forEach((r, i) => {
      if (r.words.filter((w) => /[\p{L}\p{N}]/u.test(w)).length !== 1) return;
      const word = norm(r.words.join(' '));
      // The heading's own visible words (textContent would also hold a picture's fallback text).
      const all = norm(rows.flatMap((x) => x.words).join(' '));
      const wholes = [...r.clauses].map((c) => norm(c.textContent)).concat(all);
      if (wholes.includes(word)) return;
      // A whole sentence: the word ends a sentence and the line before it did
      // too. A lead label that opens the heading and ends at its colon or dash
      // ("Friction:", "Self-repair —") is a whole clause as well.
      const prevEnds = i === 0 || /[.!?:;—]$/.test(rows[i - 1].words.at(-1));
      if (prevEnds && /[.!?]$/.test(word)) return;
      if (i === 0 && /[:—]$/.test(word)) return;
      lone.push(word);
    });
    const split = [];
    for (let i = 1; i < rows.length; i++) {
      for (const term of TERMS) {
        const t = term.toLowerCase().split(' ');
        for (let k = 1; k < t.length; k++) {
          const tail = rows[i - 1].words.slice(-k).map(bare).join(' ');
          const head = rows[i].words.slice(0, t.length - k).map(bare).join(' ');
          if (`${tail} ${head}` === t.join(' ')) split.push(term);
        }
      }
    }
    out.push({ tag: h.tagName.toLowerCase(), text: rows.map((r) => r.words.join(' ')).join(' / '), overflow, lone, split, broken });
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
for (const width of WIDTHS) {
  const phone = width < 640;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  const only = opt('--pages')?.split(',');
  for (const page of only ?? site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    for (const h of await p.evaluate(headings, TERMS)) {
      if (print) console.log(`${String(width).padStart(4)} ${page.padEnd(40)} ${h.tag} ${h.text}`);
      const where = `${width} ${page} ${h.tag} "${h.text}"`;
      if (h.overflow) failures.push(`${where}: runs past its column`);
      for (const word of h.lone) failures.push(`${where}: "${word}" is alone on a line and is not a whole clause`);
      for (const term of h.split) failures.push(`${where}: "${term}" breaks across two lines`);
      for (const word of h.broken) failures.push(`${where}: "${word}" breaks inside itself`);
    }
  }
  await ctx.close();
}
await browser.close();
site.close();
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `${failures.length} heading failure(s)` : `heading-lines: every h1-h4 holds at ${WIDTHS.join(', ')}`);
process.exit(failures.length ? 1 : 0);
