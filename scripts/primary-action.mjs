// Real-browser check that a product page's primary action (Download or
// Install) is in the first view (Ari's ruling on taste review r20,
// 2026-11-07: on /ouro-md/download/, Ouro MD's front door from ouro.bot, the
// Download button was an 11px sliver at 1440x900, 5px short at 1920x1080 and
// below the fold at 1024 and 1280).
//
//   npm run build && node scripts/primary-action.mjs
//   node scripts/primary-action.mjs --base https://ouroboros.bot   (a live site)
//
// Every product page (PRODUCT_PAGES) marks its hero lede [data-hero-lede] and
// its primary action [data-primary-action]: the button row, or for Desk the
// setup line with its Copy button. It fails when
//   - a product page has no lede or not exactly one primary action, or any
//     other page has a primary action without being listed;
//   - at 1024x768, 1280x800, 1440x900 and 1920x1080 (light and dark), any
//     part of the action is outside the first view, or less than SPARE px
//     above its bottom edge;
//   - at 320, 360, 390 and 430 wide, the action is not the next element
//     after the lede, starts more than MAX_GAP px below it, or anything else
//     visible sits between them.
// Uses Playwright's chromium; override with CHROME_PATH. Prints each page's
// primary action and where it lands.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

export const PRODUCT_PAGES = ['/ouro-md/', '/ouro-md/download/', '/desk/', '/butler/', '/ouro-hx/', '/apps/'];
const DESKTOP = [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const PHONE = [[320, 568], [360, 740], [390, 844], [430, 932]];
const SPARE = 24;
const MAX_GAP = 40;
const NAV = 64;

const site = await openSite({ port: 6212, missing: '/no-such-page-primary-action/' });

function measure() {
  const visible = (el) => {
    if (!el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const actions = [...document.querySelectorAll('[data-primary-action]')].filter(visible);
  const lede = [...document.querySelectorAll('[data-hero-lede]')].find(visible);
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right }; };
  const out = { count: actions.length, lede: lede ? box(lede) : null, vh: innerHeight, vw: innerWidth };
  const action = actions[0];
  if (!action) return out;
  out.action = box(action);
  out.label = (action.querySelector('.btn-primary, button, a') || action).textContent.replace(/\s+/g, ' ').trim();
  if (lede) {
    let next = lede.nextElementSibling;
    while (next && !visible(next)) next = next.nextElementSibling;
    out.next = next === action || next?.contains(action);
    // Anything visible drawn between the lede's foot and the action's head.
    const a = out.lede.bottom + 1;
    const b = out.action.top - 1;
    out.between = [];
    if (b > a) {
      for (const el of document.querySelectorAll('main *')) {
        if (el.contains(lede) || el.contains(action) || lede.contains(el) || action.contains(el) || !visible(el)) continue;
        const r = box(el);
        if (r.bottom - r.top < 1 || r.right - r.left < 1) continue;
        if (r.top < b && r.bottom > a) out.between.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`);
      }
    }
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
const report = new Map();
for (const [width, height] of [...DESKTOP, ...PHONE]) {
  for (const scheme of ['light', 'dark']) {
    const phone = width < 640;
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, colorScheme: scheme, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
    const p = await ctx.newPage();
    // Art sizes come from CSS (aspect-ratio and the hero caps), never from the
    // image, so the layout is the same without the bytes.
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
    for (const page of site.pages) {
      const listed = PRODUCT_PAGES.includes(page);
      // Only product pages can hold an action; the rest are checked at one size.
      if (!listed && (width !== 1440 || scheme !== 'light')) continue;
      await p.goto(site.base + page, { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      const m = await p.evaluate(measure);
      const where = `${width}x${height} ${scheme} ${page}`;
      if (!listed) {
        if (m.count) failures.push(`${where}: has a [data-primary-action] but is not in PRODUCT_PAGES`);
        continue;
      }
      if (m.count !== 1) { failures.push(`${where}: ${m.count} primary actions (needs exactly one)`); continue; }
      if (!m.lede) { failures.push(`${where}: no [data-hero-lede]`); continue; }
      const a = m.action;
      if (!phone) {
        const spare = Math.round(height - a.bottom);
        if (a.top < NAV || spare < SPARE || a.left < 0 || a.right > width) failures.push(`${where}: "${m.label}" at y=${Math.round(a.top)}..${Math.round(a.bottom)}, ${spare}px above the fold (needs ${SPARE}px, fully in the first view)`);
        if (scheme === 'light') report.set(`${page} ${width}x${height}`, `"${m.label}" y=${Math.round(a.top)}..${Math.round(a.bottom)}, ${spare}px to spare`);
      } else {
        const gap = Math.round(a.top - m.lede.bottom);
        if (!m.next) failures.push(`${where}: "${m.label}" is not the next element after the lede`);
        if (gap > MAX_GAP || gap < 0) failures.push(`${where}: "${m.label}" starts ${gap}px below the lede (needs 0 to ${MAX_GAP}px)`);
        if (m.between.length) failures.push(`${where}: ${m.between.slice(0, 4).join(', ')} between the lede and "${m.label}"`);
        if (scheme === 'light') report.set(`${page} ${width}x${height}`, `"${m.label}" ${gap}px under the lede`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
site.close();
for (const [k, v] of report) console.log(`${k}: ${v}`);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `${failures.length} failure(s)` : `primary-action: ${PRODUCT_PAGES.length} product pages, each action in the first view and right under its lede on phones`);
process.exit(failures.length ? 1 : 0);
