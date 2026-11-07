// Prints every page's h1 as it wraps on a phone, line by line, at 320, 390
// and 430 (taste review r16, 2026-11-07: the /lab/story/ h1 split its muted
// second clause). Ari's ruling: on a phone each clause of a two-clause h1
// starts its own line, and a clause breaks only when it is wider than the
// column, and then at its most natural phrase boundary (.t-clause and .t-ph in
// global.css). This prints for a person to read; it fails only when an h1
// runs past its column or a .t-clause shares a line with another clause.
//
//   npm run build && node scripts/h1-lines.mjs
//   node scripts/h1-lines.mjs --base https://ouroboros.bot   (a live site)
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 6197;
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-h1-lines/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-h1-lines/');
} else {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  pages = distPages();
}

// Runs in the page: the h1's words grouped into the lines they land on.
function lines() {
  const h1 = document.querySelector('h1');
  if (!h1) return null;
  const col = h1.getBoundingClientRect();
  const rows = [];
  let overflow = false;
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode()); ) {
    for (const m of node.data.matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getBoundingClientRect();
      if (r.right > Math.max(col.right, innerWidth - 16) + 0.5) overflow = true;
      const clause = node.parentElement.closest('.t-clause, h1 > .block');
      let row = rows.find((x) => Math.abs(x.top - r.top) < r.height / 2);
      if (!row) rows.push((row = { top: r.top, words: [], clauses: new Set() }));
      row.words.push(m[0]);
      if (clause) row.clauses.add(clause);
    }
  }
  rows.sort((a, b) => a.top - b.top);
  return { text: rows.map((r) => r.words.join(' ')).join(' / '), overflow, shared: rows.some((r) => r.clauses.size > 1) };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const failures = [];
for (const width of [320, 390, 430]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of pages) {
    await p.goto(base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(lines);
    if (!r) continue;
    console.log(`${width} ${page.padEnd(40)} ${r.text}`);
    if (r.overflow) failures.push(`${width} ${page}: the h1 runs past its column`);
    if (r.shared) failures.push(`${width} ${page}: two clauses share a line`);
  }
  await ctx.close();
}
await browser.close();
server?.close();
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
