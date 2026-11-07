// Real-browser check that nothing framed starts inside the hero's art (taste
// review r11, 2026-11-06: the demo window on /ouro-md/ and /ouro-hx/ started
// 8 to 9px inside the hero's fading meadow at every desktop width, while
// ouro.bot/apps/ouro-md/ starts its window just below the fade).
//
//   npm run build && node scripts/hero-joins.mjs
//   node scripts/hero-joins.mjs --base https://ouroboros.bot   (a live site)
//
// For every page in dist/ (or every sitemap page under --base), at 1024x768,
// 1440x900 and 1920x1080, it fails when a frame, video or screenshot starts
// above the bottom of the hero image. Words may rise into the faded foot of
// the scene (global.css); pictures and windows may not. Counted as a frame:
// a video, an iframe, an image at least MIN px on both sides, and any box at
// least MIN px on both sides that draws an edge (a border, a shadow, or a
// background of its own). Nothing inside the scene itself or the site
// header counts, nor does a decorative glow (aria-hidden or an empty
// absolutely placed box).
//
// Uses Playwright's chromium; override with CHROME_PATH. --json <file> saves
// the full result.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 6197;
const VIEWPORTS = [[1024, 768], [1440, 900], [1920, 1080]];
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-hero-joins/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-hero-joins/');
} else {
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
  pages = distPages();
}

// Runs in the page: the hero image's foot, and every frame that starts above it.
function measure() {
  const MIN = 120;
  const hero = document.querySelector('.story-hero img');
  if (!hero) return null;
  const foot = hero.getBoundingClientRect().bottom + scrollY;
  const label = (el) => {
    const c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + c;
  };
  const edged = (s) =>
    (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && !/rgba\(.*, 0\)$/.test(s.borderTopColor)) ||
    (s.boxShadow && s.boxShadow !== 'none') ||
    (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) ||
    s.backgroundImage !== 'none';
  const found = [];
  for (const el of document.querySelectorAll('main *, body > section *, body > div:not(.site-header) *')) {
    if (el.closest('.story-scene, header, nav, .site-header, footer, [hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.width < MIN || r.height < MIN) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    // A glow behind the section (aria-hidden, absolutely placed, empty) is light, not a frame.
    if (el.closest('[aria-hidden="true"]') || ((s.position === 'absolute' || s.position === 'fixed') && !el.textContent.trim() && !el.querySelector('img,video,iframe,canvas'))) continue;
    const tag = el.tagName.toLowerCase();
    const isFrame = tag === 'video' || tag === 'iframe' || tag === 'img' || tag === 'canvas' || edged(s);
    if (!isFrame) continue;
    const top = r.top + scrollY;
    if (top < foot - 0.5 && r.bottom + scrollY > foot - 400) found.push({ el: label(el), top: Math.round(top), gap: +(top - foot).toFixed(1) });
  }
  return { foot: Math.round(foot), found };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const result = { base, pages: pages.length, checked: 0, failures: [], joins: [] };
for (const page of pages) {
  for (const [width, height] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const m = await p.evaluate(measure);
    await ctx.close();
    if (!m) continue;
    result.checked++;
    for (const f of m.found) result.failures.push(`${width} ${page} ${f.el} starts ${Math.abs(f.gap)}px above the hero's foot (y=${f.top}, foot=${m.foot})`);
  }
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 1024, 1440 and 1920 (${result.checked} hero views): ${result.failures.length} frames start inside the hero`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
