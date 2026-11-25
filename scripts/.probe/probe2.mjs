import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const src = readFileSync('scripts/section-seams.mjs', 'utf8');
const settle = src.match(/async function settle\(limit\) \{[\s\S]*?\n\}/)[0];
const [base, page, throttle, runs] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5] || 3)];
const browser = await chromium.launch({ ignoreDefaultArgs: ['--enable-features=CDPScreenshotNewSurface'] });
const where = () => { const m = document.querySelector('.story-meadow'), f = document.querySelector('footer'); return [Math.round(performance.now()), document.documentElement.scrollHeight, Math.round(m.getBoundingClientRect().top + scrollY), Math.round(f.getBoundingClientRect().top + scrollY)]; };
for (let i = 0; i < runs; i++) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
  const p = await ctx.newPage();
  if (throttle > 1) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.goto(base + page, { waitUntil: 'load' });
  await p.evaluate(`(${settle})(20000)`);
  await p.addStyleTag({ content: 'header, .site-header, nav, .skip-link { visibility: hidden !important; } .reveal { opacity: 1 !important; transform: none !important; }' });
  await p.evaluate(() => document.fonts.ready);
  const a = await p.evaluate(where);
  await p.screenshot({ fullPage: true, clip: { x: 2, y: 0, width: 12, height: 8000 } });
  const b = await p.evaluate(where);
  await p.screenshot({ fullPage: true, clip: { x: 2, y: 32000, width: 12, height: 5000 } });
  const c = await p.evaluate(where);
  console.log(scheme, a.join(','), '|', b.join(','), '|', c.join(','), a[2] === c[2] ? 'still' : 'MOVED');
  await ctx.close();
}
await browser.close();
