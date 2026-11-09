// Reads shots/request.json: [{ "base": "https://...", "out": "before", "pages": ["/", ...], "sizes": ["phone", "laptop"], "foot": true }].
// For each page: the first view, and the page's foot (the meadow and footer), at each size, light and dark.
// Phones are emulated as touch devices (isMobile, hasTouch). "menu": true adds the open phone menu at the
// top of the page; "focus": true adds, on a laptop, crops of the first Tab stop and of the family bar's first
// focused link.
// One browser; one context per shot, closed after it.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const SIZES = { phone: [390, 844], laptop: [1440, 900] };
const requests = JSON.parse(readFileSync(new URL('./request.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const failures = [];
try {
  for (const req of requests) {
    if (req.base === "local") req.base = "http://127.0.0.1:4321";
    const out = `out/${req.out}`;
    mkdirSync(out, { recursive: true });
    for (const path of req.pages) {
      for (const size of req.sizes ?? Object.keys(SIZES)) {
        const [width, height] = SIZES[size];
        for (const theme of req.themes ?? ['light', 'dark']) {
          const phone = size === 'phone';
          const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: phone ? 2 : 1, reducedMotion: 'reduce', isMobile: phone, hasTouch: phone });
          await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
          const p = await ctx.newPage();
          const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/[/.]/g, '-');
          try {
            await p.goto(req.base.replace(/\/$/, '') + path, { waitUntil: 'networkidle', timeout: 60000 });
            await p.evaluate(() => document.fonts.ready);
            if (path.endsWith('.jpg') || path.endsWith('.png')) {
              await p.screenshot({ path: `${out}/${slug}-${size}.png`, fullPage: true });
              continue;
            }
            await p.waitForTimeout(800);
            await p.screenshot({ path: `${out}/${slug}-${size}-${theme}-top.png` });
            if (req.menu && phone) {
              await p.tap('#menu-toggle');
              await p.waitForTimeout(600);
              await p.screenshot({ path: `${out}/${slug}-${size}-${theme}-menu.png` });
              await p.tap('#menu-toggle');
              await p.waitForTimeout(300);
            }
            if (req.focus && !phone) {
              const pad = (b) => ({ x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 16), width: Math.min(width - Math.max(0, b.x - 24), b.width + 48), height: b.height + 32 });
              await p.keyboard.press('Tab');
              await p.waitForTimeout(200);
              let box = await p.evaluate(() => { const r = document.activeElement?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; });
              if (box && box.width > 2) await p.screenshot({ path: `${out}/${slug}-${size}-${theme}-tab1.png`, clip: { x: 0, y: 0, width: Math.min(width, 640), height: 120 } });
              for (let i = 0; i < 4; i++) {
                const inBar = await p.evaluate(() => !!document.activeElement?.closest('[data-ouro="family-bar"]'));
                if (inBar) break;
                await p.keyboard.press('Tab');
                await p.waitForTimeout(150);
              }
              box = await p.evaluate(() => { const r = document.activeElement?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; });
              if (box) await p.screenshot({ path: `${out}/${slug}-${size}-${theme}-focus.png`, clip: pad(box), scale: 'device' });
              await p.keyboard.press('Escape');
              await p.evaluate(() => document.activeElement?.blur());
            }
            if (req.foot !== false) {
              await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
              await p.waitForTimeout(2500);
              await p.evaluate(async () => { await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 6000); }))); });
              await p.screenshot({ path: `${out}/${slug}-${size}-${theme}-foot.png` });
            }
          } catch (e) {
            failures.push(`${req.out} ${path} ${size} ${theme}: ${e.message}`);
          } finally {
            await ctx.close();
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}
for (const f of failures) console.log(f);
console.log('done');
