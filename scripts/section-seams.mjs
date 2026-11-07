// Real-browser check that every change of section flows, with no seam (taste
// review r13, 2026-11-06: /lab/ jumped from rgb(7,11,10) to rgb(13,30,20) in a
// single row under its opening at 1440 in dark, with a softer step in light).
// Round 10 checked only the band above the footer meadow; this checks every
// section change on every page.
//
//   npm run build && node scripts/section-seams.mjs
//   node scripts/section-seams.mjs --base https://ouroboros.bot
//   node scripts/section-seams.mjs --base https://ouro.bot --pages /apps/ouro-md/
//
// For every page, at 1440x900 and 390x844, light and dark, it finds every
// section change: the top and foot of each section in <main> (and of any
// block that paints its own background there), the top of the footer meadow
// and the top of the footer. Around each one (60px either side) it reads the
// page's own ground at both side edges, 12px wide, away from any words, with
// the header hidden, and fails on a jump of more than MAX_JUMP (the sum of the
// R, G and B steps) between the three rows above a line and the three below. Rows inside a scene image
// are skipped: the art is meant to have detail. The trail of light the site
// draws on a section change (any block whose ::before paints the trail on its
// top edge, read from the computed style, so a plain hairline never passes as
// one) is hidden while reading, so it never counts as a seam;
// where a section change carries that trail, the change itself may step in
// colour on its exact row (the trail marks it, as on the home page), but the
// ground either side of it must still run smooth. Reveal animations are off
// (reduced motion), so the page is read as it settles.
//
// Uses Playwright's chromium; override with CHROME_PATH. --json <file> saves
// the full result.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_JUMP = 6;
const WINDOW = 60;
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const VIEWPORTS = [[1440, 900], [390, 844]];
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-seams/' : rel];
  });
}

let pages;
if (opt('--pages')) {
  pages = opt('--pages').split(',');
} else if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-seams/');
}
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
      res.end(await readFile(join(DIST, '404.html')).catch(() => ''));
    }
  });
  // Any free port, so it never collides with another check running alongside.
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
  pages ??= [...new Set(distPages())];
}

// Runs in the page: every section change, and the scene images to skip.
function changes() {
  const y = (v) => Math.round(v + scrollY);
  const out = new Map();
  const trailed = (el) => el.hasAttribute('data-seam-trail');
  const main = document.querySelector('main');
  const blocks = main ? [...main.querySelectorAll(':scope > *, :scope > * > section, section')] : [];
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    if (r.height < 40 || r.width < innerWidth * 0.9) continue;
    out.set(y(r.top), out.get(y(r.top)) || trailed(el));
    const next = el.nextElementSibling;
    out.set(y(r.bottom), out.get(y(r.bottom)) || Boolean(next && trailed(next) && Math.abs(next.getBoundingClientRect().top - r.bottom) < 2));
  }
  for (const sel of ['.story-meadow', 'footer']) {
    const el = document.querySelector(sel);
    if (el && !out.has(y(el.getBoundingClientRect().top))) out.set(y(el.getBoundingClientRect().top), false);
  }
  const scenes = [...document.querySelectorAll('.story-scene img, .story-scene')].map((el) => {
    const r = el.getBoundingClientRect();
    return [y(r.top), y(r.bottom)];
  });
  const height = document.documentElement.scrollHeight;
  return { at: [...out].filter(([v]) => v > WINDOW_ && v < height - 2).sort((a, b) => a[0] - b[0]), scenes, height };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
// Decodes a screenshot in the browser itself (no image library, so the same
// script runs on both sites): the mean colour of each row in a 12px strip at
// each side edge, 2px in.
const decoder = await (await browser.newContext()).newPage();
async function sideStrips(png) {
  return decoder.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const h = img.naturalHeight;
    const strip = (x0) => {
      const c = document.createElement('canvas');
      c.width = 12;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, x0, 0, 12, h, 0, 0, 12, h);
      const d = g.getImageData(0, 0, 12, h).data;
      const out = new Array(h * 3).fill(0);
      for (let r = 0; r < h; r++) for (let x = 0; x < 12; x++) for (let k = 0; k < 3; k++) out[r * 3 + k] += d[(r * 12 + x) * 4 + k] / 12;
      return out;
    };
    return { left: strip(2), right: strip(img.naturalWidth - 14), height: h };
  }, 'data:image/png;base64,' + png.toString('base64'));
}
const result = { base, pages: pages.length, checked: 0, worst: 0, failures: [], all: [] };
for (const page of pages) {
  for (const [width, height] of VIEWPORTS) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
      await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
      const p = await ctx.newPage();
      await p.goto(base + page, { waitUntil: 'load' });
      // Mark every block that really draws the trail on its top edge (its
      // ::before is shown and paints the trail's image), before hiding it.
      await p.evaluate(() => {
        for (const el of document.querySelectorAll('main *, footer')) {
          const b = getComputedStyle(el, '::before');
          if (b.display !== 'none' && b.content !== 'none' && /data:image\/svg/.test(b.backgroundImage) && Math.abs(parseFloat(b.top) + parseFloat(b.height) / 2) < 2) el.setAttribute('data-seam-trail', '');
        }
      });
      await p.addStyleTag({ content: 'header, .site-header, nav, .skip-link { visibility: hidden !important; } .reveal { opacity: 1 !important; transform: none !important; } [data-seam-trail]::before { display: none !important; }' });
      await p.evaluate(() => document.fonts.ready);
      const m = await p.evaluate(`(${changes.toString().replace('WINDOW_', String(WINDOW))})()`);
      const shot = await p.screenshot({ fullPage: true });
      await ctx.close();
      const edges = await sideStrips(shot);
      const inScene = (r) => m.scenes.some(([a, b]) => r >= a - 1 && r <= b + 1);
      const row = (r, side) => edges[side].slice(r * 3, r * 3 + 3);
      const band = (r0, side) => { const s = [0, 0, 0]; for (let r = r0; r < r0 + 3; r++) { const v = row(r, side); for (let c = 0; c < 3; c++) s[c] += v[c] / 3; } return s; };
      const seen = new Set();
      for (const [at, trail] of m.at) {
        let worst = 0;
        let where = at;
        for (const x0 of ['left', 'right']) {
          for (let r = Math.max(3, at - WINDOW); r < Math.min(edges.height - 3, at + WINDOW); r++) {
            if (inScene(r) || inScene(r - 1)) continue;
            if (trail && Math.abs(r - at) <= 3) continue;
            // Three rows either side, so the ground's fine grain (a level or two,
            // row to row) never reads as a step; a real seam holds on both sides.
            if (inScene(r - 3) || inScene(r + 2)) continue;
            const a = band(r - 3, x0);
            const b = band(r, x0);
            const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
            if (d > worst) { worst = d; where = r; }
          }
        }
        if (seen.has(where)) continue;
        seen.add(where);
        result.checked++;
        result.worst = Math.max(result.worst, worst);
        const line = `${width}${scheme[0]} ${page} y=${where}${trail ? ' (trail)' : ''}: ${worst.toFixed(1)}`;
        result.all.push(line);
        if (worst > MAX_JUMP) result.failures.push(`${line} (a seam: the ground steps ${worst.toFixed(1)} in one row)`);
      }
    }
  }
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 1440 and 390, light and dark: ${result.checked} section changes, worst row step ${result.worst.toFixed(1)}, ${result.failures.length} seams over ${MAX_JUMP}`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
