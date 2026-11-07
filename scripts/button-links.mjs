// Real-browser check that no button, or link drawn as one, is underlined
// (taste review r18, 2026-11-07: "Read the blog ->" on /approach/ was
// underlined inside its bordered button, the only one on either site). A
// control counts as a button when it is a <button>, or a link with a fill or
// a border all round. Checked at 390 and 1440, at rest and on hover.
//
//   npm run build && node scripts/button-links.mjs
//   node scripts/button-links.mjs --base https://ouroboros.bot   (a live site)
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { launchOptions, openSite } from './lib/site-pages.mjs';

const site = await openSite({ port: 6209, missing: '/no-such-page-button-links/' });

function buttons() {
  const out = [];
  const seen = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  for (const el of document.querySelectorAll('a, button')) {
    if (!el.getClientRects().length || el.closest('[hidden], noscript')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none' && seen(s[`border${side}Color`]));
    const filled = seen(s.backgroundColor);
    if (el.tagName === 'A' && !bordered && !filled) continue;
    // The underline may sit on the control or on any text inside it.
    const lines = [el, ...el.querySelectorAll('*')].filter((x) => x.textContent.trim() && getComputedStyle(x).textDecorationLine.includes('underline'));
    if (lines.length) out.push(`${el.tagName.toLowerCase()} "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
  }
  return out;
}

const browser = await chromium.launch(launchOptions());
const failures = [];
let pagesSeen = 0;
for (const width of [390, 1440]) {
  const phone = width < 640;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of site.pages) {
    await p.goto(site.base + page, { waitUntil: 'load' });
    pagesSeen++;
    for (const b of await p.evaluate(buttons)) failures.push(`${width} ${page}: ${b} is underlined`);
    // Hover each button-styled link once and look again.
    if (!phone) {
      const handles = await p.$$('a.btn-primary, a.btn-ghost, button.btn-primary, button.btn-ghost');
      for (const h of handles) {
        if (!(await h.isVisible())) continue;
        await h.hover({ force: true }).catch(() => {});
        const deco = await h.evaluate((el) => [el, ...el.querySelectorAll('*')].some((x) => x.textContent.trim() && getComputedStyle(x).textDecorationLine.includes('underline')));
        if (deco) failures.push(`${width} ${page}: "${(await h.textContent()).replace(/\s+/g, ' ').trim()}" underlines on hover`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
site.close();
for (const f of [...new Set(failures)]) console.log(`FAIL ${f}`);
console.log(failures.length ? `${new Set(failures).size} underlined button(s)` : `button-links: no button underlined on ${pagesSeen} page views`);
process.exit(failures.length ? 1 : 0);
