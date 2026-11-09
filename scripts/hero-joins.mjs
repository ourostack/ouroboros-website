// Real-browser check that nothing framed starts inside the hero's art (taste
// review r11, 2026-11-06: the demo window on /ouro-md/ and /ouro-hx/ started
// 8 to 9px inside the hero's meadow at every desktop width).
//
//   npm run build && node scripts/hero-joins.mjs
//   node scripts/hero-joins.mjs --base https://ouroboros.bot   (a live site)
//
// For every page in dist/ (or every sitemap page under --base), at 1024x768,
// 1440x900 and 1920x1080, it fails when a frame, video or screenshot starts
// above the bottom of the hero image. Counted as a frame:
// a video, an iframe, an image at least MIN px on both sides, and any box at
// least MIN px on both sides that draws an edge (a border, a shadow, or a
// background of its own). Nothing inside the scene itself or the site
// header counts, nor does a decorative glow (aria-hidden or an empty
// absolutely placed box).
//
// On a phone (320, 390 and 430 wide) it also fails when any character in the
// hero stands within 16px of either side of the screen (taste review r13: Ouro
// touched the right edge of the factory's phone hero), from the rendered
// image's box and the cast's place across the phone crop (phoneCastX in
// src/data/scenes.mjs). A character the art itself cuts at its own edge
// (phoneArtEdge) is reported, not failed.
//
// At every width above, it also fails when a page's breadcrumb (the Lab's
// "<- Lab · page · status" row) is not aligned like its h1 (Ari's ruling,
// taste review r14): under a centred title, the breadcrumb's visible items
// centre on the column, and so does the block that directly follows a
// centred hero ("Words used here"); under a left-aligned title, the
// breadcrumb starts at the column's left edge.
//
// At 1024, 1440 and 1920 it also fails when the hero's box runs past its
// rendered image on any side (Ari's ruling on taste review r15: the round-11
// apron ran the box 61 to 123px past the art on six pages, showing a smeared
// band), when the hero, its picture or its image carries any mask (no
// picture fades into the page: Ari, 2026-11-08), or when, once the image has
// landed, the scene's painted placeholder is still set behind it.
//
// Uses Playwright's chromium; override with CHROME_PATH. --json <file> saves
// the full result.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { phoneCastX, phoneArtEdge, PHONE_EDGE } from '../src/data/scenes.mjs';

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
  // The hero's box against its image: no side may run past the art.
  const scene = hero.closest('.story-hero');
  const sb = scene.getBoundingClientRect();
  const ib = hero.getBoundingClientRect();
  const past = { top: ib.top - sb.top, bottom: sb.bottom - ib.bottom, left: ib.left - sb.left, right: sb.right - ib.right };
  const overrun = Object.entries(past).filter(([, d]) => d > 0.5).map(([side, d]) => `${side} ${d.toFixed(1)}px`);
  const masked = [scene, hero.parentElement, hero].filter((el) => {
    const s = getComputedStyle(el);
    return [s.maskImage, s.webkitMaskImage].some((m) => m && m !== 'none');
  }).map((el) => el.tagName.toLowerCase());
  const paint = hero.complete && hero.naturalWidth && getComputedStyle(scene).backgroundImage !== 'none' ? getComputedStyle(scene).backgroundImage.slice(0, 40) : null;
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
  return { foot: Math.round(foot), found, overrun, masked, paint };
}

// Runs in the page: does the breadcrumb (and the block after a centred hero) align with the h1?
function alignment() {
  const crumbs = document.querySelector('.lab-status .lab-items');
  const h1 = document.querySelector('main h1');
  if (!crumbs || !h1 || !crumbs.getClientRects().length) return null;
  const problems = [];
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { left: r.left + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.paddingRight) };
  };
  // The visible span of the row, on every line it takes: each item's own
  // content, after the padding that holds its leading dot.
  const items = [...crumbs.children];
  const left = Math.min(...items.map((i) => i.getBoundingClientRect().left + parseFloat(getComputedStyle(i).paddingLeft)));
  const right = Math.max(...items.map((i) => i.getBoundingClientRect().right));
  const col = box(crumbs.closest('.lab-line'));
  const centred = getComputedStyle(h1).textAlign === 'center';
  const mid = (left + right) / 2 - (col.left + col.right) / 2;
  if (centred && Math.abs(mid) > 4) problems.push(`breadcrumb sits ${mid.toFixed(0)}px off the centre under a centred h1`);
  if (!centred && Math.abs(left - col.left) > 2) problems.push(`breadcrumb starts ${(left - col.left).toFixed(0)}px from the column's left under a left-aligned h1`);
  if (centred) {
    const hero = h1.closest('section');
    const next = hero?.nextElementSibling;
    const block = next?.matches('[data-glossary]') ? next : next?.querySelector(':scope > [data-glossary]');
    if (block && getComputedStyle(block).textAlign !== 'center') problems.push('the block after a centred hero ("Words used here") is not centred');
  }
  return problems;
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
    for (const a of (await p.evaluate(alignment)) ?? []) result.failures.push(`${width} ${page} ${a}`);
    await ctx.close();
    if (!m) continue;
    result.checked++;
    for (const f of m.found) result.failures.push(`${width} ${page} ${f.el} starts ${Math.abs(f.gap)}px above the hero's foot (y=${f.top}, foot=${m.foot})`);
    if (m.masked.length) result.failures.push(`${width} ${page} the hero fades: a mask on ${m.masked.join(', ')}`);
    if (m.overrun.length) result.failures.push(`${width} ${page} the hero's box runs past its image: ${m.overrun.join(', ')}`);
    if (m.paint) result.failures.push(`${width} ${page} the hero's placeholder paint is still set after the image landed (${m.paint}...)`);
  }
}
// The phone pass: where the cast lands on screen.
const PHONES = [[320, 640], [390, 844], [430, 932]];
result.phoneChecked = 0;
result.artEdge = [];
for (const page of pages) {
  for (const [width, height] of PHONES) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(base + page, { waitUntil: 'load' });
    const m = await p.evaluate(() => {
      const wrap = document.querySelector('.story-hero[data-brand-scene], .story-hero [data-brand-scene]');
      const img = document.querySelector('.story-hero img');
      if (!wrap || !img) return null;
      const r = img.getBoundingClientRect();
      return { scene: wrap.getAttribute('data-brand-scene'), left: r.left, width: r.width, vw: document.documentElement.clientWidth };
    });
    for (const a of (await p.evaluate(alignment)) ?? []) result.failures.push(`${width} ${page} ${a}`);
    await ctx.close();
    if (!m) continue;
    result.phoneChecked++;
    const cast = phoneCastX[m.scene];
    if (!cast) { result.failures.push(`${width} ${page}: no phoneCastX for ${m.scene}`); continue; }
    const fromLeft = m.left + cast[0] * m.width;
    const fromRight = m.vw - (m.left + cast[1] * m.width);
    if (fromLeft < PHONE_EDGE - 0.01) result.failures.push(`${width} ${page} (${m.scene}): a character ${fromLeft.toFixed(1)}px from the left edge`);
    if (fromRight < PHONE_EDGE - 0.01) result.failures.push(`${width} ${page} (${m.scene}): a character ${fromRight.toFixed(1)}px from the right edge`);
    if (phoneArtEdge[m.scene] && width === 390) result.artEdge.push(`${page} (${m.scene}, ${phoneArtEdge[m.scene].side}): ${phoneArtEdge[m.scene].reason}`);
  }
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 1024, 1440 and 1920 (${result.checked} hero views), and at 320, 390 and 430 (${result.phoneChecked} phone heroes): ${result.failures.length} failures`);
for (const a of result.artEdge) console.log(`  art edge (not failed): ${a}`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
