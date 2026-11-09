// Reads shots/crops.json: { "bases": { "before": url, "after": url }, "items": [{ "name", "path", "w", "h", "dpr", "themes", "sel", "above", "height", "focus" }] }.
// For each item, base and theme: scrolls the element `sel` to `above` px below the top of the view and shoots
// `height` px of the view's full width (the whole view when sel is missing). One context per shot, closed after it.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const req = JSON.parse(readFileSync(new URL('./crops.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const failures = [];
try {
  for (const item of req.items) {
    for (const [tag, base] of Object.entries(req.bases)) {
      for (const theme of item.themes ?? ['light']) {
        mkdirSync(`out/${tag}`, { recursive: true });
        const phone = item.w < 700;
        const ctx = await browser.newContext({ viewport: { width: item.w, height: item.h }, deviceScaleFactor: item.dpr ?? 1, colorScheme: theme, reducedMotion: 'reduce', isMobile: phone, hasTouch: phone });
        await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
        const p = await ctx.newPage();
        const file = `out/${tag}/${item.name}-${item.w}-${theme}.png`;
        try {
          await p.goto(base.replace(/\/$/, '') + item.path, { waitUntil: 'networkidle', timeout: 60000 });
          await p.evaluate(() => document.fonts.ready);
          let clip;
          if (item.sel) {
            const top = await p.evaluate(({ sel, above }) => {
              const el = document.querySelector(sel);
              if (!el) return null;
              scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - above));
              return el.getBoundingClientRect().top;
            }, { sel: item.sel, above: item.above ?? 80 });
            if (top === null) { console.log(`skip ${file}: no ${item.sel}`); await ctx.close(); continue; }
            if (item.focus) { await p.keyboard.press('Tab'); await p.evaluate((f) => document.querySelector(f)?.focus({ preventScroll: true }), item.focus); }
            await p.waitForTimeout(900);
            clip = { x: 0, y: 0, width: item.w, height: Math.min(item.h, item.height ?? item.h) };
          } else await p.waitForTimeout(900);
          await p.screenshot({ path: file, clip });
          console.log(`ok ${file}`);
        } catch (e) { failures.push(`${file}: ${e.message.split('\n')[0]}`); }
        await ctx.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
