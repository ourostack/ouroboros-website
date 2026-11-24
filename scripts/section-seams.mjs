// Real-browser check that every change of section flows, with no seam (taste
// review r13, 2026-11-06: /lab/ jumped from rgb(7,11,10) to rgb(13,30,20) in a
// single row under its opening at 1440 in dark, with a softer step in light).
// Round 10 checked only the band above the footer meadow; this checks every
// section change on every page.
//
//   npm run build && node scripts/section-seams.mjs
//   node scripts/section-seams.mjs --base https://ouroboros.bot
//   node scripts/section-seams.mjs --base https://ouroboros.bot --pages /ouro-md/download/
//
// For every page, at 1440x900 and 390x844, light and dark, it finds every
// section change: the top and foot of each section in <main> (and of any
// block that paints its own background there), the top of the footer meadow
// and the top of the footer. Around each one (60px either side) it reads the
// page's own ground at both side edges, 12px wide, away from any words, with
// the header hidden, and fails on a jump of more than MAX_JUMP (the sum of the
// R, G and B steps) between the three rows above a line and the three below. Rows inside a scene image
// are skipped: the art is meant to have detail. The hairline the site draws on
// a section change (any block whose ::before paints a 1px line on its top
// edge, read from the computed style, so a border never passes as one, or
// whose ::after draws it on its foot, as a hero's does) is hidden while
// reading, so it never counts as a seam;
// where a section change carries that hairline, the change itself may step in
// colour on its exact row (the hairline marks it, as on the home page), but the
// ground either side of it must still run smooth. Reveal animations are off
// (reduced motion), so the page is read as it settles.
//
// Rows are read only once every picture on the page has arrived and decoded
// (settle): every <img>, lazy and deferred ones brought into view, and every CSS
// background image (#442: a picture still on its way over a section change
// left a one-off seam). A seam's line names the pictures it skipped near it and
// any picture that had not arrived, so the log says why it was read there.
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

// Runs in the page: waits until every picture on it has arrived and decoded, so no
// row is read while a picture over a section change is still on its way (#442).
// Pictures held back for a scroll (loading="lazy", or the site's data-src
// pictures, which Layout.astro sets once the hero lands or an observer sees
// them) are brought in by a scroll to the foot and back; every <img> is then
// waited for (complete, then decode()), and so is every CSS background image,
// on any element or its ::before or ::after. Returns what did not arrive in
// SETTLE_MS, for the log.
async function settle(limit) {
  const until = Date.now() + limit;
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  for (const img of document.images) if (img.loading === 'lazy') img.loading = 'eager';
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await frame(); }
  scrollTo(0, 0);
  await frame();
  const left = () => Math.max(0, until - Date.now());
  const within = (promise) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, left()))]);
  // A picture whose src the page sets later (data-src, once an observer sees it) is brought into view until it has one.
  const pending = () => [...document.querySelectorAll('img[data-src]:not([src])')].filter((img) => img.getClientRects().length);
  while (pending().length && left() > 0) {
    for (const img of pending()) { img.scrollIntoView({ block: 'center' }); await frame(); }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  scrollTo(0, 0);
  await frame();
  const arrived = (img) => img.complete && (!img.currentSrc || img.naturalWidth > 0);
  await within(Promise.all([...document.images].map(async (img) => {
    if (!arrived(img)) await new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
    if (img.currentSrc) await img.decode().catch(() => {});
  })));
  const urls = new Set();
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const bg = getComputedStyle(el, pseudo).backgroundImage;
      if (bg && bg !== 'none') for (const [, url] of bg.matchAll(/url\("?([^")]+)"?\)/g)) urls.add(url);
    }
  }
  const late = [];
  await within(Promise.all([...urls].map(async (url) => {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { late.push(`background ${url}`); }
  })));
  await frame();
  await frame();
  for (const img of document.images) if (img.getClientRects().length && ((img.dataset.src && !img.getAttribute('src')) || !arrived(img))) late.push(`img ${img.currentSrc || img.dataset.src || img.getAttribute('src')}`);
  return late;
}

// Runs in the page: every section change, and the scene images to skip.
function changes() {
  const y = (v) => Math.round(v + scrollY);
  const out = new Map();
  const trailed = (el) => el.hasAttribute('data-seam-trail');
  const footed = (el) => el.hasAttribute('data-seam-trail-foot');
  const main = document.querySelector('main');
  const blocks = main ? [...main.querySelectorAll(':scope > *, :scope > * > section, section')] : [];
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    if (r.height < 40 || r.width < innerWidth * 0.9) continue;
    out.set(y(r.top), out.get(y(r.top)) || trailed(el));
    const next = el.nextElementSibling;
    out.set(y(r.bottom), out.get(y(r.bottom)) || footed(el) || Boolean(next && trailed(next) && Math.abs(next.getBoundingClientRect().top - r.bottom) < 2));
  }
  for (const sel of ['.story-meadow', 'footer']) {
    const el = document.querySelector(sel);
    // The footer's own hairline marks its top, also where the last section of
    // a page with no meadow ends right on it.
    if (el) out.set(y(el.getBoundingClientRect().top), out.get(y(el.getBoundingClientRect().top)) || trailed(el));
  }
  const scenes = [...document.querySelectorAll('.story-scene img, .story-scene, [data-ouro="hero"] [data-slot="media"]')].map((el) => {
    const r = el.getBoundingClientRect();
    return [y(r.top), y(r.bottom), el.tagName === 'IMG' ? el.currentSrc.replace(location.origin, '') : el.className];
  });
  const height = document.documentElement.scrollHeight;
  return { at: [...out].filter(([v]) => v > WINDOW_ && v < height - 2).sort((a, b) => a[0] - b[0]), scenes, height };
}

// How long a page's pictures have to arrive and decode before its rows are read anyway (the log then names them).
const SETTLE_MS = 20_000;
// Playwright turns on Chromium's CDPScreenshotNewSurface, which copies the
// page for a screenshot before the browser has drawn a frame for it and
// sometimes gets nothing back ("Unable to capture screenshot"). Without it,
// Chromium waits for the redraw first; the pixels are the same.
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  ignoreDefaultArgs: ['--enable-features=CDPScreenshotNewSurface'],
});
// Decodes a screenshot in the browser itself (no image library, so the same
// script runs on both sites): the mean colour of each row of a 12px strip.
// Only the two strips are captured, 2px in from each side edge, so the page
// is never encoded or decoded at full width.
const decoder = await (await browser.newContext()).newPage();
async function strip(png) {
  return decoder.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 12, h).data;
    const out = new Array(h * 3).fill(0);
    for (let r = 0; r < h; r++) for (let x = 0; x < 12; x++) for (let k = 0; k < 3; k++) out[r * 3 + k] += d[(r * 12 + x) * 4 + k] / 12;
    return { rows: out, height: h };
  }, 'data:image/png;base64,' + png.toString('base64'));
}
const result = { base, pages: pages.length, checked: 0, worst: 0, failures: [], all: [], late: [], scenes: [] };
// Each page, viewport and scheme is read in its own context, SEAMS_JOBS at a
// time (default 4); results are gathered in the same order as a serial run.
const tasks = pages.flatMap((page) => VIEWPORTS.flatMap(([width, height]) => ['light', 'dark'].map((scheme) => ({ page, width, height, scheme }))));
// One view takes a few seconds; a view that takes this long has hung, and the
// error names it and the step it was on instead of leaving the run to be killed silently.
const VIEW_TIMEOUT_MS = 60_000;
async function read(task) {
  const { page, width, height, scheme } = task;
  const tag = `${width}${scheme[0]} ${page}`;
  const state = { step: 'starting' };
  const started = Date.now();
  console.log(`start  ${tag}`);
  let timer;
  const hung = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${tag} did not finish in ${VIEW_TIMEOUT_MS / 1000} s; last step: ${state.step}`)), VIEW_TIMEOUT_MS);
  });
  try {
    const out = await Promise.race([readView(task, state), hung]);
    console.log(`done   ${tag} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    return out;
  } finally {
    clearTimeout(timer);
  }
}
async function readView({ page, width, height, scheme }, state) {
  const out = { checked: 0, worst: 0, failures: [], all: [], late: [], scenes: [] };
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  state.step = 'opening the page';
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
  const p = await ctx.newPage();
  await p.goto(base + page, { waitUntil: 'load' });
  state.step = 'waiting for pictures to settle';
  const late = await p.evaluate(`(${settle.toString()})(${SETTLE_MS})`);
  state.step = 'marking hairlines';
  // Mark every block that really draws the hairline on its top edge (its
  // ::before is shown, 1px tall, on the edge, in a colour), before hiding it.
  await p.evaluate(() => {
    const line = (s) => s.display !== 'none' && s.content !== 'none' && s.position === 'absolute' && parseFloat(s.height) <= 1.5 && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor);
    for (const el of document.querySelectorAll('main *, .story-meadow, footer')) {
      const b = getComputedStyle(el, '::before');
      if (line(b) && Math.abs(parseFloat(b.top)) < 2) el.setAttribute('data-seam-trail', '');
      // A hero draws the hairline on its foot instead (its ::after sits just
      // under the art's bottom edge): the change below it is marked.
      const a = getComputedStyle(el, '::after');
      if (line(a) && Math.abs(parseFloat(a.top) - el.getBoundingClientRect().height) < 2) el.setAttribute('data-seam-trail-foot', '');
    }
  });
  await p.addStyleTag({ content: 'header, .site-header, nav, .skip-link { visibility: hidden !important; } .reveal { opacity: 1 !important; transform: none !important; } [data-seam-trail]::before, [data-seam-trail-foot]::after { display: none !important; }' });
  await p.evaluate(() => document.fonts.ready);
  state.step = 'finding section changes';
  const m = await p.evaluate(`(${changes.toString().replace('WINDOW_', String(WINDOW))})()`);
  // A screen at a time, scrolled into view, at the page's own viewport. A
  // full-page capture stretches the viewport while it runs, and the site sizes
  // its hero and scenes from vh and svh, so everything below them moved during
  // the capture and, on a busy runner, was read at another place than it was
  // measured (website#562: the meadow drawn 12 rows below its measured foot).
  // Fixed and sticky elements are hidden first, so none repeats in every screen.
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) if (/^(fixed|sticky)$/.test(getComputedStyle(el).position)) el.style.setProperty('visibility', 'hidden', 'important');
  });
  const edges = { left: [], right: [], height: 0 };
  for (let top = 0; top < m.height; top += height) {
    const h = Math.min(height, m.height - top);
    state.step = `capturing the screen at y=${top}`;
    // At the foot the page scrolls only as far as it goes; the rows from top to
    // top + h are still in view, lower down it. A clip is in viewport coordinates.
    const at = await p.evaluate(async (y) => { scrollTo(0, y); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); return y - scrollY; }, top);
    const left = await strip(await p.screenshot({ clip: { x: 2, y: at, width: 12, height: h } }));
    const right = await strip(await p.screenshot({ clip: { x: width - 14, y: at, width: 12, height: h } }));
    edges.left.push(...left.rows);
    edges.right.push(...right.rows);
    edges.height += left.height;
  }
  state.step = 'closing the context';
  await ctx.close();
  const tag = `${width}${scheme[0]} ${page}`;
  out.late.push(...late.map((what) => `${tag}: ${what} had not arrived after ${SETTLE_MS / 1000} s`));
  out.scenes.push(...m.scenes.map(([a, b, what]) => `${tag} y=${a}-${b}: ${what}`));
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
    out.checked++;
    out.worst = Math.max(out.worst, worst);
    const line = `${width}${scheme[0]} ${page} y=${where}${trail ? ' (hairline)' : ''}: ${worst.toFixed(1)}`;
    out.all.push(line);
    if (worst > MAX_JUMP) {
      // Why the rows there were read: the pictures it skipped near the change, and any that never arrived.
      const near = m.scenes.filter(([a, b]) => b >= at - WINDOW && a <= at + WINDOW).map(([a, b, what]) => `y=${a}-${b} ${what}`);
      const why = [near.length ? `pictures skipped near it: ${near.join('; ')}` : 'no picture skipped near it', ...(late.length ? [`not arrived: ${late.join('; ')}`] : [])];
      out.failures.push(`${line} (a seam: the ground steps ${worst.toFixed(1)} in one row; ${why.join('; ')})`);
    }
  }
  return out;
}
const outs = new Array(tasks.length);
let next = 0;
await Promise.all(Array.from({ length: Math.min(Math.max(1, Number(process.env.SEAMS_JOBS || 4)), tasks.length) }, async () => {
  while (next < tasks.length) { const n = next++; outs[n] = await read(tasks[n]); }
}));
for (const out of outs) {
  result.checked += out.checked;
  result.worst = Math.max(result.worst, out.worst);
  result.all.push(...out.all);
  result.failures.push(...out.failures);
  result.late.push(...out.late);
  result.scenes.push(...out.scenes);
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 1440 and 390, light and dark: ${result.checked} section changes, worst row step ${result.worst.toFixed(1)}, ${result.failures.length} seams over ${MAX_JUMP}`);
for (const f of result.failures) console.log(`  ${f}`);
for (const l of result.late) console.log(`  warning: ${l}`);
process.exit(result.failures.length ? 1 : 0);
