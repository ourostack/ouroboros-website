// Real-browser test of swipe to close on the phone menu (taste review r17,
// 2026-11-07: swipes up, down, left and right all left it open on both
// sites). Dispatches real touch events through the DevTools protocol, the way
// a finger would, at 390x844 and 320x568.
//
//   npm run build && node scripts/menu-swipe.mjs
//   node scripts/menu-swipe.mjs --base https://ouroboros.bot   (a live site)
//
// It checks that
//   - a swipe down the panel, or back up toward the bar, closes the menu, hands
//     focus back to the toggle, unlocks the page and keeps its scroll place;
//   - the panel follows the finger during the drag and stays opaque (the
//     menu is opaque; nothing behind it shows through);
//   - a short drag under the threshold springs back and leaves it open;
//   - a sideways swipe leaves it open;
//   - under prefers-reduced-motion nothing follows the finger and the swipe
//     closes it at once.
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

const site = await openSite({ port: 6204, missing: '/no-such-page-menu-swipe/' });
const PAGES = ['/', '/lab/docs/'];
const TOGGLE = '#menu-toggle';
const MENU = '#mobile-menu';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function swipe(cdp, from, to, { steps = 8, hold = 0, during } = {}) {
  const point = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
  let duringResult;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, y) });
    await wait(16);
  }
  if (during) duringResult = await during();
  if (hold) await wait(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return duringResult;
}

const state = (p) => p.evaluate(([t, m]) => {
  const menu = document.querySelector(m);
  return {
    open: document.querySelector(t).getAttribute('aria-expanded') === 'true' && !menu.classList.contains('hidden') && !menu.hidden,
    focus: document.activeElement === document.querySelector(t),
    locked: document.documentElement.classList.contains('menu-open') || document.body.style.overflow === 'hidden',
    transform: menu.style.transform,
    y: window.scrollY,
  };
}, [TOGGLE, MENU]);

const browser = await chromium.launch(launchOptions());
const failures = [];
const results = [];
for (const [width, height] of [[390, 844], [320, 568]]) {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
    for (const page of PAGES) {
      await p.goto(site.base + page, { waitUntil: 'load' });
      // Wait for the scroll to land: on a slow runner a late layout or scroll
      // restoration can leave the page at the top for the first case (CI, PR #40).
      await p.waitForFunction(() => {
        window.scrollTo(0, 900);
        return Math.abs(window.scrollY - Math.min(900, document.documentElement.scrollHeight - innerHeight)) < 2;
      });
      await wait(100);
      const cx = width / 2, cy = Math.round(height * 0.55);
      const cases = [
        ['down', { x: cx, y: cy - 60 }, { x: cx, y: cy + 140 }, false],
        ['up', { x: cx, y: cy + 60 }, { x: cx, y: cy - 140 }, false],
        ['short drag', { x: cx, y: cy }, { x: cx, y: cy + 36 }, true],
        ['sideways', { x: cx - 120, y: cy }, { x: cx + 120, y: cy + 8 }, true],
      ];
      for (const [name, from, to, staysOpen] of cases) {
        const label = `${width}x${height} ${reducedMotion} ${page} ${name}`;
        const before = await state(p);
        await p.tap(TOGGLE);
        await wait(50);
        if (!(await state(p)).open) { failures.push(`${label}: the menu did not open`); continue; }
        const mid = await swipe(cdp, from, to, { hold: name === 'short drag' ? 120 : 0, during: () => p.evaluate((m) => { const el = document.querySelector(m); return { t: el.style.transform, o: getComputedStyle(el).opacity }; }, MENU) });
        const opaque = mid.o === "1";
        if (!opaque) failures.push(`${label}: the panel faded to opacity ${mid.o} during the drag (it stays opaque)`);
        const midT = mid.t;
        await wait(450);
        const after = await state(p);
        const follows = reducedMotion === "reduce" ? midT === "" : (name === "sideways" ? midT === "" : /translateY\(-?\d/.test(midT));
        results.push({ label, mid: midT, after });
        if (!follows) failures.push(`${label}: during the drag the panel's transform was "${midT}"`);
        if (staysOpen) {
          if (!after.open) failures.push(`${label}: the menu closed`);
          if (after.transform) failures.push(`${label}: the panel did not spring back (transform "${after.transform}")`);
        } else {
          if (after.open) failures.push(`${label}: the menu stayed open`);
          if (!after.focus) failures.push(`${label}: focus did not return to the toggle`);
          if (after.locked) failures.push(`${label}: the page stayed locked`);
          if (after.transform) failures.push(`${label}: the panel kept a transform "${after.transform}"`);
          if (Math.abs(after.y - before.y) > 1) failures.push(`${label}: the page moved from ${before.y} to ${after.y}`);
        }
        if ((await state(p)).open) { await p.keyboard.press('Escape'); await wait(50); }
      }
    }
    await ctx.close();
  }
}
await browser.close();
site.close();
for (const r of results) console.log(`${r.label}: mid-drag transform "${r.mid}", then ${r.after.open ? 'open' : 'closed'}${r.after.focus ? ', focus on the toggle' : ''}, scrollY ${r.after.y}`);
console.log(`${results.length} swipes: ${failures.length} failures`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
