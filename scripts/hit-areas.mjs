// Real-browser check that every button and every link outside running prose
// has at least a 44x44 hit area on a phone (taste review r14, 2026-11-07: the
// docs Copy control on /lab/docs/getting-started/ was 61x16; taste review r15
// widened it to every link and button that is not inline in a sentence: the
// footer links, the logo, the breadcrumbs, the Desk demo's Replay, the home
// page's principle rows and the standalone "->" links). The look may stay
// small; the area a finger can hit may not. ouro.bot/apps/ouro-md/ runs the
// same check (ourostack/ouro-apps-site, scripts/hit-areas.mjs).
//
//   npm run build && node scripts/hit-areas.mjs
//   node scripts/hit-areas.mjs --base https://ouroboros.bot   (a live site)
//
// For every page in dist/ (or every sitemap page under --base), at 320x640 and
// 390x844, every visible <button>, [role=button], <summary> and link is
// scrolled into view, and a 44x44 square centred on it is probed with
// elementFromPoint on a 5x5 grid. Each probe inside the viewport must land on
// the control itself, a child of it, or its own pseudo-element hit area.
// Exempt, as WCAG 2.5.5 allows: a link inline in running prose, that is, one
// with words of the sentence beside it in the same inline run (text of its
// own parent, or of an inline ancestor up to the nearest block). Uses
// Playwright's chromium; override with CHROME_PATH. --json <file> saves the
// full result.
//
// Controls inside a demo window that only appear while it plays (a clip's
// Pause/Play, a terminal demo's Skip and Replay, any tab) start out [hidden],
// and under reduced motion they never show, so the first pass cannot see them
// (taste review r16: the Ouro MD demo's Pause was 60x31 with a 32px hit area,
// and this check missed it). A second pass shows each such button on its own,
// probes it, and hides it again.

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
  // A link inline in running prose: words of the sentence sit beside it, as
  // text of its own parent or of an inline ancestor up to the nearest block.
  const inProse = (a) => {
    if (getComputedStyle(a).display !== 'inline') return false;
    let child = a;
    for (let el = a.parentElement; el; child = el, el = el.parentElement) {
      for (const n of el.childNodes) if (n !== child && n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent)) return true;
      // Words in an inline sibling (an <em>, a <code>) count as the sentence too.
      for (const sib of el.children) if (sib !== child && !sib.matches('a, button') && getComputedStyle(sib).display === 'inline' && !sib.closest('[aria-hidden="true"]') && /[A-Za-z0-9]{2}/.test(sib.textContent)) return true;
      if (getComputedStyle(el).display !== 'inline') return false;
    }
    return false;
  };
  const all = [...document.querySelectorAll('button, [role="button"], summary, a[href]')].filter((el) => {
    if (!el.getClientRects().length || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.pointerEvents === 'none') return false;
    if (el.matches('a[href]') && !el.matches('[role="button"]')) return !inProse(el);
    return true;
  });
  all.forEach((el, i) => el.setAttribute('data-hit-probe', i));
  return all.length;
}

// Runs in the page: the [hidden] buttons whose own box would show once
// unhidden (their parent is rendered), tagged for the second pass.
function hiddenControls(start) {
  const all = [...document.querySelectorAll('button[hidden], [role="button"][hidden], [role="tab"][hidden]')].filter((el) => {
    const parent = el.parentElement;
    return parent && parent.getClientRects().length && !parent.closest('[hidden], [inert], [aria-hidden="true"]');
  });
  all.forEach((el, i) => el.setAttribute('data-hit-probe', start + i));
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
    const hiddenCount = await p.evaluate(hiddenControls, n);
    result.controls += hiddenCount;
    for (let i = n; i < n + hiddenCount; i++) {
      await p.evaluate((i) => { document.querySelector(`[data-hit-probe="${i}"]`).hidden = false; }, i);
      const r = await p.evaluate(probe, i);
      await p.evaluate((i) => { document.querySelector(`[data-hit-probe="${i}"]`).hidden = true; }, i);
      if (r.misses.length > r.probes / 3) {
        const key = `${page} ${r.label}`;
        if (!seen.has(key)) result.failures.push(`${width} ${page} ${r.label} ${r.size} (shown while a demo plays): ${r.misses.length}/${r.probes} probes miss (e.g. ${r.misses[0].join(',')})`);
        seen.add(key);
      }
    }
    await ctx.close();
  }
}
await browser.close();
server?.close();
if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
console.log(`${pages.length} pages at 320 and 390: ${result.controls} control views, ${result.failures.length} under a 44x44 hit area (links inline in prose exempt)`);
for (const f of result.failures) console.log(`  ${f}`);
process.exit(result.failures.length ? 1 : 0);
