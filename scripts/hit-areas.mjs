// Real-browser check that every button and link-button has at least a 44x44
// hit area on a phone (taste review r14, 2026-11-07: the docs Copy control on
// /lab/docs/getting-started/ was 61x16). The look may stay small; the area a
// finger can hit may not. ouro.bot/apps/ouro-md/ runs the same check
// (ourostack/ouro-apps-site, scripts/hit-areas.mjs).
//
//   npm run build && node scripts/hit-areas.mjs
//   node scripts/hit-areas.mjs --base https://ouroboros.bot   (a live site)
//
// For every page in dist/ (or every sitemap page under --base), at 320x640 and
// 390x844, every visible <button>, [role=button], <summary> and link-button
// (a link with a btn class, or a link drawn as a box: a background or a
// border of its own) is scrolled into view, and a 44x44 square centred on it
// is probed with elementFromPoint on a 5x5 grid. Each probe inside the
// viewport must land on the control itself, a child of it, or its own
// pseudo-element hit area. Uses Playwright's chromium; override with
// CHROME_PATH. --json <file> saves the full result.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 6195;
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-hit-areas/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-hit-areas/');
} else {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
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

// Runs in the page: the controls to probe, tagged so the probe can find them again.
function controls() {
  const boxy = (a) => {
    const s = getComputedStyle(a);
    if (/\bbtn\b|\bbtn-/.test(a.className)) return true;
    if (s.display === 'inline') return false;
    const bg = s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor);
    const border = ['Top', 'Right', 'Bottom', 'Left'].every((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
    return bg || border;
  };
  const all = [...document.querySelectorAll('button, [role="button"], summary, a[href]')].filter((el) => {
    if (!el.getClientRects().length || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.pointerEvents === 'none') return false;
    if (el.matches('a[href]') && !el.matches('[role="button"]')) return boxy(el);
    return true;
  });
  all.forEach((el, i) => el.setAttribute('data-hit-probe', i));
  return all.length;
}

function probe(i) {
  const el = document.querySelector(`[data-hit-probe="${i}"]`);
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const misses = [];
  let probes = 0;
  for (let gx = 0; gx < 5; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      const x = cx - 21.5 + (43 * gx) / 4;
      const y = cy - 21.5 + (43 * gy) / 4;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      probes++;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === el || el.contains(hit))) misses.push([Math.round(x - cx), Math.round(y - cy), hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') : 'nothing']);
    }
  }
  const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  return { label: `${el.tagName.toLowerCase()} "${label}"`, size: `${Math.round(r.width)}x${Math.round(r.height)}`, probes, misses };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const result = { base, pages: pages.length, controls: 0, failures: [] };
for (const page of pages) {
  for (const [width, height] of [[320, 640], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)(?:\?|$)/, (r) => r.abort());
    await p.goto(base + page, { waitUntil: 'load' });
    // Folded excerpts open, so their controls count too.
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const n = await p.evaluate(controls);
    result.controls += n;
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const r = await p.evaluate(probe, i);
      // Over a third of the square missing is a small control; a corner
      // clipped by a neighbour is not.
      if (r.misses.length > r.probes / 3) {
        const line = `${width} ${page} ${r.label} ${r.size}: ${r.misses.length}/${r.probes} probes miss (e.g. ${r.misses[0].join(',')})`;
        const key = `${page} ${r.label}`;
        if (!seen.has(key)) result.failures.push(line);
        seen.add(key);
      }
    }
    await ctx.close();
  }
}
await browser.close();
server?.close();
if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 320 and 390: ${result.controls} control views, ${result.failures.length} under a 44x44 hit area`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
