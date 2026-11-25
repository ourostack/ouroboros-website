import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const scheme of ['light','dark']) {
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
const p = await ctx.newPage();
await p.goto(process.argv[2], { waitUntil: 'load' });
const info = await p.evaluate(() => {
  const f = document.querySelector('footer'); const out = [];
  const walk = (el, d) => { if (d > 3) return; const r = el.getBoundingClientRect(), y0 = f.getBoundingClientRect().top; const cs = getComputedStyle(el), b = getComputedStyle(el, '::before'), a = getComputedStyle(el, '::after');
    out.push(`${'  '.repeat(d)}${el.tagName}.${(el.className?.baseVal ?? el.className).toString().slice(0,60)} y=${Math.round(r.top - y0)} h=${Math.round(r.height)} bg=${cs.backgroundColor} img=${cs.backgroundImage.slice(0,80)} before=${b.content !== 'none' ? b.top + '/' + b.height + '/' + b.backgroundImage.slice(0,60) + '/' + b.backgroundColor : '-'} after=${a.content !== 'none' ? a.top + '/' + a.height + '/' + a.backgroundImage.slice(0,60) : '-'}`);
    for (const c of el.children) walk(c, d + 1); };
  walk(f, 0); return out.join('\n'); });
console.log('==', scheme); console.log(info);
await ctx.close(); }
await browser.close();
