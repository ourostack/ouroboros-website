// Real-browser check that a failed scene image steps down a size instead of
// leaving only the blurred paint (taste review r12, 2026-11-06: a one-off 503
// on the 1536 AVIF left /lab/model-reviews/'s hero as its paint at 1920).
//
//   npm run build && node scripts/image-fallback.mjs
//   node scripts/image-fallback.mjs --base https://ouroboros.bot   (a live site)
//
// The same check as ouro.bot's (ourostack/ouro-apps-site,
// scripts/image-fallback.mjs); keep the two in step. On each page in PAGES it
// answers chosen scene requests with a 503 and fails unless the hero lands on
// the expected file:
//  - 1920, the 1536 AVIF fails:          the 960 AVIF (the next size down);
//  - 1920, every AVIF fails:             the 960 WebP (the last resort);
//  - 390 at 2x, the phone 768 AVIF fails: the phone 384 AVIF;
//  - 1920, every scene file fails:       the painted dawn (data-failed), no glyph.
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 6200;
const PAGES = ['/lab/model-reviews/', '/'];
const CASES = [
  { name: '1536 AVIF fails', viewport: [1920, 1080], dpr: 1, block: /scenes\/[\w-]+-1536\.avif$/, want: /scenes\/[\w-]+-960\.avif$/ },
  { name: 'every AVIF fails', viewport: [1920, 1080], dpr: 1, block: /\.avif$/, want: /scenes\/[\w-]+-960\.webp$/ },
  { name: 'phone 768 AVIF fails', viewport: [390, 844], dpr: 2, block: /phone\/[\w-]+-768\.avif$/, want: /phone\/[\w-]+-384\.avif$/ },
  { name: 'every scene file fails', viewport: [1920, 1080], dpr: 1, block: /\/brand\/storybook\/(scenes|headers|phone)\//, want: 'paint' },
];
let base = opt('--base')?.replace(/\/$/, '');
let server;
if (!base) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(DIST, path));
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(await readFile(join(DIST, '404.html')));
    }
  });
  await new Promise((resolve) => server.listen(PORT, resolve));
  base = `http://localhost:${PORT}`;
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const failures = [];
let checked = 0;
for (const page of PAGES) {
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.viewport[0], height: c.viewport[1] }, deviceScaleFactor: c.dpr, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const blocked = [];
    await p.route((url) => c.block.test(url.pathname), (route) => { blocked.push(new URL(route.request().url()).pathname); return route.fulfill({ status: 503, body: 'unavailable' }); });
    await p.goto(base + page, { waitUntil: 'load' });
    const hero = p.locator('.story-hero img').first();
    let state;
    try {
      await p.waitForFunction(() => { const i = document.querySelector('.story-hero img'); return i && ((i.complete && i.naturalWidth > 0) || i.hasAttribute('data-failed')); }, null, { timeout: 15000 });
      state = await hero.evaluate((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, failed: i.hasAttribute('data-failed'), shown: getComputedStyle(i).visibility }));
    } catch {
      state = await hero.evaluate((i) => ({ src: i.currentSrc || i.src, ok: false, failed: i.hasAttribute('data-failed'), shown: getComputedStyle(i).visibility }));
    }
    await ctx.close();
    checked++;
    const got = state.failed ? 'paint' : new URL(state.src).pathname;
    const pass = c.want === 'paint' ? state.failed && state.shown === 'hidden' : state.ok && !state.failed && c.want.test(got);
    const line = `${c.viewport[0]} ${page} ${c.name} (${blocked.length} answered 503): landed on ${got}`;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${line}`);
    if (!pass) failures.push(line);
    if (!blocked.length) failures.push(`${line}: nothing was blocked, so the case proved nothing`);
  }
}
await browser.close();
server?.close();
console.log(`${checked} failed-image cases on ${PAGES.length} pages: ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
