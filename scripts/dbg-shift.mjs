import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = createServer((q, r) => { const p = decodeURIComponent(q.url.split('?')[0]); let f = join('dist', p); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html'); if (!existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[extname(f)] || 'application/octet-stream'); r.end(readFileSync(f)); }).listen(4399);
const b = await chromium.launch();
async function one(scheme, i) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.addInitScript(() => { window.__s = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__s.push({ v: e.value, t: Math.round(e.startTime), src: e.sources.map((s) => ({ n: s.node && s.node.tagName + '.' + String(s.node.className).slice(0, 40), p: [s.previousRect.y, s.previousRect.height, s.currentRect.y, s.currentRect.height].map(Math.round) })) }))).observe({ type: 'layout-shift', buffered: true }); });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4399/approach/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => window.__s);
  console.log(scheme, i, s.length ? JSON.stringify(s) : 'none');
  await ctx.close();
}
for (let round = 0; round < 8; round++) await Promise.all(['light', 'dark'].flatMap((s) => [0, 1, 2, 3].map((i) => one(s, round * 4 + i))));
await b.close(); srv.close();
