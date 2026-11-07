// Real-browser check that every page shares one phone column and that every
// control speaks the page's font (taste review r12, 2026-11-06: the phone
// gutter was 20px on /, /approach/, /apps/, /butler/, /ouro-hx/ and
// ouro.bot/apps/ouro-md/ but 24px everywhere else, and ouro.bot's "Copy"
// label fell back to Arial).
//
//   npm run build && node scripts/phone-column.mjs
//   node scripts/phone-column.mjs --base https://ouroboros.bot   (a live site)
//
// The same check as ouro.bot's (ourostack/ouro-apps-site,
// scripts/phone-column.mjs); keep the two in step. For every page it fails on:
//  - gutter: at 320, 390 and 430, the page's column (the leftmost visible
//    start of any heading or paragraph in main, clipped by any ancestor that
//    clips) is not GUTTER px from the left edge, the one gutter Ari ruled
//    for both sites. Text that is indented inside the column (a list, a
//    quote, a heading beside its mark) is fine; text left of it is not.
//  - header: at 320, 390 and 430, the bar's mark does not start GUTTER px from
//    the left, the menu icon does not end GUTTER px from the right, or the
//    menu or theme button is smaller than a 44px tap target (taste review
//    r13: the mark started at 16px and the menu button ended 8px from the
//    edge on both sites).
//  - font:   at 390, any button, input, select or textarea whose computed
//    font is not one of the sites' own faces (FACES), so no control ever
//    falls back to the browser's Arial or system font.
//
// Uses Playwright's chromium; override with CHROME_PATH. --json <file> saves
// the full result.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const GUTTER = 24;
const FACES = ['Outfit', 'JetBrains Mono', 'Cormorant Garamond'];
const WIDTHS = [320, 390, 430];
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 6199;
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-phone-column/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-phone-column/');
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

// Runs in the page: the column's left edge and the leftmost text, plus every
// control's font.
function measure(faces) {
  const label = (el) => {
    const c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + c;
  };
  const clips = (s) => /hidden|clip|auto|scroll/.test(s.overflowX);
  let column = Infinity, at = '';
  for (const el of document.querySelectorAll('main h1, main h2, main h3, main p')) {
    if (el.closest('.story-scene, [hidden], [aria-hidden="true"]') || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden') continue;
    let left = r.left;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (clips(getComputedStyle(a))) left = Math.max(left, a.getBoundingClientRect().left);
    }
    if (left < column - 0.5) { column = left; at = label(el); }
  }
  const off = [];
  for (const el of document.querySelectorAll('button, input, select, textarea')) {
    const family = getComputedStyle(el).fontFamily;
    const first = family.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (!faces.includes(first)) off.push(`${label(el)} "${(el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" in ${family}`);
  }
  // The header: the mark's left edge, the visible menu icon's right edge, and
  // both buttons' tap targets.
  const header = {};
  const mark = document.querySelector('.brand-home img, .brand img');
  if (mark) header.mark = Math.round(mark.getBoundingClientRect().left * 10) / 10;
  const toggle = document.querySelector('#menu-toggle, .menu-toggle');
  const icon = toggle && [...toggle.querySelectorAll('svg')].find((svg) => getComputedStyle(svg).display !== 'none');
  if (icon) header.icon = Math.round((document.documentElement.clientWidth - icon.getBoundingClientRect().right) * 10) / 10;
  header.targets = [toggle, document.querySelector('#theme-toggle, .theme-toggle')].filter(Boolean).map((b) => {
    const r = b.getBoundingClientRect();
    return { label: label(b), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  });
  return { column: Math.round(column * 10) / 10, at, off, header };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const result = { base, pages: pages.length, gutter: GUTTER, failures: [], columns: {} };
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const page of pages) {
    await p.goto(base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const m = await p.evaluate(measure, FACES);
    (result.columns[page] ||= {})[width] = m.column;
    if (Math.abs(m.column - GUTTER) > 0.5) result.failures.push(`${width} ${page} column starts at ${m.column}px (${m.at}), not ${GUTTER}px`);
    if (width === 390) for (const o of m.off) result.failures.push(`${width} ${page} ${o}`);
    const h = m.header;
    (result.header ||= {})[`${width} ${page}`] = h;
    if (h.mark === undefined || Math.abs(h.mark - GUTTER) > 0.5) result.failures.push(`${width} ${page} header mark starts at ${h.mark}px, not ${GUTTER}px`);
    if (h.icon === undefined || Math.abs(h.icon - GUTTER) > 0.5) result.failures.push(`${width} ${page} menu icon ends ${h.icon}px from the right, not ${GUTTER}px`);
    for (const t of h.targets) if (t.w < 44 || t.h < 44) result.failures.push(`${width} ${page} ${t.label} is ${t.w}x${t.h}, under a 44px tap target`);
  }
  await ctx.close();
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at ${WIDTHS.join(', ')}: ${result.failures.length} off the ${GUTTER}px column (text and header), under a 44px tap target, or off the sites' faces (${FACES.join(', ')})`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
