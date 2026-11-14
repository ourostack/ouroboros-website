// Real-browser check of the gap between a page's hero text and its body on a
// phone (taste review r16, 2026-11-07: /lab/what-is-an-agent-harness/ left
// about 128px between its hero lede and its first paragraph, where other
// pages leave 48). Two rhythms, one each:
//
//   flow     the body carries on from the hero (a byline, the glossary, a
//            first paragraph, a note, a prompt): 48px (3rem).
//   section  the body opens a new titled section (an h2): 96px (6rem).
//
// The hero is the <section> that holds the page's h1, or a narrower
// [data-hero-text] around the h1 where the body shares that section. Its text
// ends at the lowest visible text in it, or at the foot of art shown whole
// inside it (.story-contained, the Ouro Hero's media); the body starts at the top of the
// block holding the first visible text below that. Every page in dist/ (or every
// sitemap page under --base) is measured at 320x640, 390x844 and 430x932, and
// a gap more than 4px off its rhythm fails.
//
//   npm run build && node scripts/hero-gap.mjs
//   node scripts/hero-gap.mjs --base https://ouroboros.bot   (a live site)
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RHYTHM = { flow: 48, section: 96 };
const TOLERANCE = 4;
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL(opt('--dist') ?? '../dist', import.meta.url));
const PORT = 6198;
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-hero-gap/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/${opt('--sitemap') ?? 'sitemap-0.xml'}`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
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
  pages = distPages().filter((p) => !p.startsWith('/no-such-page'));
}

// Runs in the page.
function measure() {
  // Content: an element with words of its own, or a picture, a field or a button.
  const isContent = (el) => /^(?:IMG|SVG|VIDEO|CANVAS|PRE|BUTTON|INPUT|TEXTAREA|IFRAME)$/i.test(el.tagName) || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 1 || r.width < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' && !el.closest('[aria-hidden="true"], .sr-only, .story-scene, .story-meadow, [hidden], #main-nav, footer');
  };
  const content = (root) => [...root.querySelectorAll('*')].filter((el) => isContent(el) && shown(el));
  const h1 = document.querySelector('main h1') || document.querySelector('h1');
  if (!h1) return null;
  // The hero is a [data-hero-text] around the h1 where the body shares its
  // section (the docs pages' split layout), or else the h1's <section> or
  // <header>.
  const head = h1.closest('[data-hero-text], section, header') || h1.parentElement;
  const art = [...head.querySelectorAll('.story-contained')];
  const end = Math.max(...[h1, ...content(head), ...art].map((el) => el.getBoundingClientRect().bottom));
  const main = document.querySelector('main') || document.body;
  const next = content(main)
    .filter((el) => !head.contains(el) && el.getBoundingClientRect().top >= end - 1)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
  if (!next) return null;
  // The body starts at the edge of the block its first words sit in: a note's
  // rule or a pill's outline, not the text inset inside it.
  let start = next;
  while (start.parentElement && start.parentElement !== main && !start.parentElement.contains(head)
    && start.parentElement.getBoundingClientRect().top >= end - 1
    && next.getBoundingClientRect().top - start.parentElement.getBoundingClientRect().top <= 12) start = start.parentElement;
  // A section opens on its h2, on a small label just above it, or on a label
  // marked [data-section-start].
  const h2 = [...(next.closest('section') || main).querySelectorAll('h2')].find((h) => h.getBoundingClientRect().top >= next.getBoundingClientRect().top - 1);
  const kind = next.closest('h2, [data-section-start]') || (h2 && h2.getBoundingClientRect().top - next.getBoundingClientRect().top <= 80) ? 'section' : 'flow';
  return { gap: Math.round(start.getBoundingClientRect().top - end), kind, next: `${next.tagName.toLowerCase()} "${next.textContent.trim().replace(/\s+/g, ' ').slice(0, 32)}"` };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const failures = [];
for (const [width, height] of [[320, 640], [390, 844], [430, 932]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
  for (const page of pages) {
    await p.goto(base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(measure);
    if (!r) { console.log(`${width} ${page.padEnd(38)} (no body below the hero)`); continue; }
    const want = RHYTHM[r.kind];
    const ok = Math.abs(r.gap - want) <= TOLERANCE;
    console.log(`${width} ${page.padEnd(38)} ${String(r.gap).padStart(4)}px ${r.kind.padEnd(7)} ${ok ? 'ok  ' : 'OFF '} next ${r.next}`);
    if (!ok) failures.push(`${width} ${page}: ${r.gap}px to the ${r.kind} below the hero, want ${want}`);
  }
  await ctx.close();
}
await browser.close();
server?.close();
console.log(`${failures.length} gaps off the rhythm (flow ${RHYTHM.flow}px, section ${RHYTHM.section}px)`);
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
