import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const settle = eval('(' + src.match(/async function settle\(limit\) \{[\s\S]*?\n\}/)[0] + ')');
const base = process.argv[3], page = process.argv[4], throttle = Number(process.argv[5] || 1);
const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} ; window.__shifts = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ t: Math.round(e.startTime), v: e.value, src: e.sources.map((s) => (s.node?.nodeName || '?') + '.' + (s.node?.className || '') + ' ' + JSON.stringify([s.previousRect.y, s.currentRect.y, s.previousRect.height, s.currentRect.height])) }); }).observe({ type: 'layout-shift', buffered: true }); }, scheme);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (throttle > 1) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  await p.goto(base + page, { waitUntil: 'load' });
  await p.evaluate(`(${settle.toString()})(20000)`);
  const t0 = await p.evaluate(() => performance.now());
  await p.evaluate(() => document.fonts.ready);
  const h0 = await p.evaluate(() => [document.documentElement.scrollHeight, Math.round(document.querySelector('.story-meadow')?.getBoundingClientRect().top + scrollY)]);
  await p.screenshot({ fullPage: true, clip: { x: 2, y: 0, width: 12, height: 100 } });
  const h1 = await p.evaluate(() => [document.documentElement.scrollHeight, Math.round(document.querySelector('.story-meadow')?.getBoundingClientRect().top + scrollY)]);
  await new Promise((r) => setTimeout(r, 1500));
  const h2 = await p.evaluate(() => [document.documentElement.scrollHeight, Math.round(document.querySelector('.story-meadow')?.getBoundingClientRect().top + scrollY)]);
  const shifts = await p.evaluate((t0) => window.__shifts.filter((s) => s.t > t0 - 2000), t0);
  console.log(scheme, 'settled at', Math.round(t0), 'before', h0, 'after shot', h1, 'later', h2);
  for (const s of shifts) console.log('  shift', s.t, s.v.toFixed(4), s.src.join(' | '));
  await ctx.close();
}
await browser.close();
