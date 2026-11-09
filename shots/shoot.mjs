// Reads shots/request.json: [{ "base": "https://...", "out": "before", "pages": ["/", ...], "sizes": ["phone", "laptop"], "foot": true }].
// For each page: the first view, and the page's foot (the meadow and footer), at each size, light and dark.
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
          const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: size === 'phone' ? 2 : 1, reducedMotion: 'reduce' });
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
