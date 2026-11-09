// Real-browser check that the phone menu shows all eleven links (the site's
// four sections and the family's seven sites) without scrolling on a 320x568
// phone, each a 44px tap target (Ari's ruling, taste review r14, 2026-11-07:
// the last two links hid below the fold with no cue). Also checks 390x844 and
// 375x667, with the page at its top (the family bar showing above the nav)
// and scrolled. The panel's own scroll stays as the fallback for anything
// shorter than 568.
//
//   npm run build && node scripts/menu-fit.mjs
//   node scripts/menu-fit.mjs --base https://ouroboros.bot   (a live site)
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
const PORT = 6196;
let base = opt('--base')?.replace(/\/$/, '');
let server;
if (!base) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(DIST, path));
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(PORT, resolve));
  base = `http://localhost:${PORT}`;
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const failures = [];
for (const [width, height] of [[320, 568], [375, 667], [390, 844]]) {
  for (const [page, scrolled] of [['/', false], ['/', true], ['/lab/docs/getting-started/', false]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)$/, (r) => r.abort());
    await p.goto(base + page, { waitUntil: 'load' });
    if (scrolled) await p.evaluate(() => window.scrollTo(0, 600));
    await p.click('#menu-toggle');
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => {
      const panel = document.getElementById('mobile-menu');
      const links = [...panel.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        return { text: a.textContent.trim(), top: r.top, bottom: r.bottom, height: r.height, width: r.width };
      });
      return { links, scroll: panel.scrollHeight - panel.clientHeight, vh: innerHeight, top: panel.getBoundingClientRect().top, navBottom: document.getElementById('nav-bg').getBoundingClientRect().bottom };
    });
    await ctx.close();
    const at = `${width}x${height} ${page}${scrolled ? ' (scrolled)' : ''}`;
    if (m.links.length !== 11) failures.push(`${at}: ${m.links.length} links, not eleven`);
    if (m.top < m.navBottom - 0.5) failures.push(`${at}: the panel starts at ${Math.round(m.top)}, above the nav's foot at ${Math.round(m.navBottom)}`);
    if (m.scroll > 0) failures.push(`${at}: the menu scrolls by ${m.scroll}px`);
    for (const l of m.links) {
      if (l.bottom > m.vh + 0.5) failures.push(`${at}: "${l.text}" ends at ${Math.round(l.bottom)}, below the screen`);
      if (l.height < 44 - 0.5 || l.width < 44 - 0.5) failures.push(`${at}: "${l.text}" is ${Math.round(l.width)}x${Math.round(l.height)}, under 44px`);
    }
    console.log(`${at}: ${m.links.length} links, last ends at ${Math.round(m.links.at(-1)?.bottom)} of ${m.vh}, menu scroll ${m.scroll}`);
  }
}
await browser.close();
server?.close();
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
