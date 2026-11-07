// Real-browser check that a control keeps one box when its label swaps
// (taste review r17, 2026-11-07: the Desk demo's Replay was 66px wide and its
// Skip 52px, so the control jumped sideways when pressed). Ari's ruling: every
// demo control has a fixed width that fits its longest label, as Pause/Play
// already had. ouro.bot runs the same check (ourostack/ouro-apps-site,
// scripts/label-swap.mjs).
//
//   npm run build && node scripts/label-swap.mjs
//   node scripts/label-swap.mjs --base https://ouroboros.bot   (a live site)
//
// For every page, at 390 and 1440 wide, it swaps each label the way the
// page's own scripts do and measures the control after each swap:
//   - a Copy button's label: its own words, then "Copied";
//   - a clip's Pause/Play toggle: "Pause", then "Play";
//   - a terminal demo's Skip and Replay, which share one place: each shown
//     on its own;
//   - any element with data-labels="A|B": each label in turn.
// It fails when any of those boxes differ by more than half a pixel.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

const site = await openSite({ port: 6203, missing: '/no-such-page-label-swap/' });

// Runs in the page: every control whose box changes with its label.
function swaps() {
  const box = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width * 2) / 2, h: Math.round(r.height * 2) / 2 }; };
  const same = (a, b) => Math.abs(a.w - b.w) <= 0.5 && Math.abs(a.h - b.h) <= 0.5;
  const out = [];
  const tried = { controls: 0 };
  const check = (control, name, states) => {
    const boxes = states.map(([label, apply]) => { apply(); return { label, ...box(control) }; });
    tried.controls++;
    if (boxes.some((b) => !same(b, boxes[0]))) out.push(`${name}: ${boxes.map((b) => `"${b.label}" ${b.w}x${b.h}`).join(', ')}`);
  };
  const relabel = (labelEl, labels) => {
    const original = labelEl.textContent;
    return [...labels.map((l) => [l, () => { labelEl.textContent = l; }]), [original, () => { labelEl.textContent = original; }]];
  };
  for (const label of document.querySelectorAll('[data-copy-label], .prompt-copy-label')) {
    const button = label.closest('button');
    if (!button || !button.getClientRects().length) continue;
    check(button, `Copy "${label.textContent.trim()}"`, relabel(label, [label.textContent, 'Copied']));
  }
  for (const toggle of document.querySelectorAll('.clip-toggle')) {
    const wasHidden = toggle.hidden;
    toggle.hidden = false;
    if (toggle.getClientRects().length) check(toggle, 'clip Pause/Play', relabel(toggle, ['Pause', 'Play']));
    toggle.hidden = wasHidden;
  }
  for (const group of document.querySelectorAll('.dp-actions')) {
    const buttons = [...group.querySelectorAll('button')];
    const was = buttons.map((b) => b.hidden);
    const boxes = buttons.map((b) => { buttons.forEach((x) => { x.hidden = x !== b; }); return { label: b.textContent.trim(), ...box(b) }; });
    buttons.forEach((b, i) => { b.hidden = was[i]; });
    if (!boxes.length || !boxes[0].w) continue;
    tried.controls++;
    if (boxes.some((b) => !same(b, boxes[0]))) out.push(`demo ${boxes.map((b) => `"${b.label}" ${b.w}x${b.h}`).join(', ')}`);
  }
  for (const el of document.querySelectorAll('[data-labels]')) {
    const control = el.closest('button, a, [role="button"]') || el;
    if (!control.getClientRects().length) continue;
    check(control, `data-labels "${el.dataset.labels}"`, relabel(el, el.dataset.labels.split('|')));
  }
  return { out, controls: tried.controls };
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let controls = 0;
for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(swaps);
    controls += r.controls;
    for (const f of r.out) failures.push(`${width} ${page} ${f}`);
  }
  await ctx.close();
}
await browser.close();
site.close();
console.log(`${site.pages.length} pages at 390 and 1440: ${controls} controls swapped, ${failures.length} change size`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
