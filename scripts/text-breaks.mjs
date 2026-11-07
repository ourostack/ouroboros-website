// Real-browser check that text never runs past its column and that URLs and
// paths never break inside a word (taste review r9, 2026-11-06: a path ran
// 36px past the column at 320 on /lab/model-reviews/, and the blog footer's
// setup link broke as "https://github.c / om/...").
//
//   npm run build && node scripts/text-breaks.mjs
//   node scripts/text-breaks.mjs --base https://ouroboros.bot   (a live site)
//
// For every page in dist/ (or every sitemap page under --base) it fails on:
//  - overflow: at 320, any line of text or inline box (code, a link, a span)
//    whose box extends past its column, unless the column scrolls sideways;
//  - break:    at 320, 390 and 430, any line break inside a word of a URL or
//    path (a word with "/", "\" or a host/file dot, or any text in code, kbd,
//    pre or .font-mono) that is not right after a "/" or right before a ".",
//    any break inside a URL's scheme and domain at all ("https://github" /
//    ".com/...", "ouroboros" / ".bot/...": taste review r10), and any break
//    inside an ordinary word that is not after a hyphen. A word is read
//    across the build's <wbr>-joined pieces (src/lib/code-wrap.mjs), so a
//    break between two pieces counts like one inside a text node. A break
//    inside a single segment wider than its whole column is the one allowed
//    last resort (a 40-character commit hash at 320).
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
const PORT = 6198;
let base = opt('--base')?.replace(/\/$/, '');
let server;

function distPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? '/no-such-page-text-breaks/' : rel];
  });
}

let pages;
if (base) {
  const map = await (await fetch(`${base}/sitemap-0.xml`)).text();
  pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  pages.push('/no-such-page-text-breaks/');
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

// Runs in the page. Returns { overflow: [], breaks: [] } for this viewport.
function analyse(checkOverflow) {
  const out = { overflow: [], breaks: [] };
  const inlineish = (d) => d.startsWith('inline') || d === 'contents';
  const colOf = (el) => {
    let e = el;
    while (e && e !== document.body && inlineish(getComputedStyle(e).display)) e = e.parentElement;
    return e || document.body;
  };
  const contentBox = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const l = r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
    const rr = r.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
    return { left: l, right: rr, width: rr - l };
  };
  const scrollsOrClips = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      // A column that scrolls sideways, or one that clips on purpose (the
      // typing playback, a visually hidden label), is not an overflow.
      if (e !== document.body && /(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
    }
    return false;
  };
  const hidden = (el) => !el.getClientRects().length || el.closest('[hidden],[aria-hidden="true"] svg,script,style,noscript,template');
  // Where a word's scheme and domain end (src/lib/code-wrap.mjs hostEnd):
  // nothing breaks before that index.
  const FILE_EXT = /^(?:md|mdx|json|jsonc|jsonl|mjs|cjs|js|ts|tsx|jsx|html?|css|txt|ya?ml|sh|astro|png|jpe?g|webp|avif|gif|svg|toml|lock|plist|swift|py|rb|go|rs|zip|gz|tgz|pdf|xml|log|env|cfg|ini|conf|webmanifest|csv|wasm|dmg|pkg)$/i;
  const TLD = /^(?:com|org|net|io|dev|ai|app|bot|me|co|gg|xyz|so|to|us|uk|ca|de|fr|jp|ly|tv|fm|page|site|cloud|tech|run|build|link|blog|news|codes|tools|works|world|email|edu|gov|info)$/i;
  const hostEnd = (word) => {
    const m = word.match(/^[("'[]*((?:[a-z][a-z0-9+.-]*:\/\/)?)((?:[A-Za-z0-9-]+\.)+([A-Za-z]{2,}))(?::\d+)?/);
    if (!m) return 0;
    const [all, scheme, , tld] = m;
    const next = word[all.length];
    if (scheme) return all.length;
    if (!TLD.test(tld) || (next !== '/' && FILE_EXT.test(tld))) return 0;
    if (next !== undefined && !/[/?#:)"'\].,;!&]/.test(next)) return 0;
    return all.length;
  };
  // Allowed: after a "/", before a "." or a URL's "?" or "#", never inside
  // the scheme and domain; in an ordinary word also after a hyphen or dash,
  // before an opening bracket or a dash, and anywhere next to CJK text.
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  const allowed = (word, isPath, host) => (i) =>
    i > host &&
    ((word[i - 1] === '/' && word[i] !== '/') || /[.?#]/.test(word[i]) ||
      (!isPath && (/[-‐-—­]/.test(word[i - 1]) || /[([{‐-—]/.test(word[i]) || cjk.test(word[i - 1]) || cjk.test(word[i]))));
  // A URL, path, host or file name, a flag, or any word of inline code.
  const pathy = (el, word) =>
    /[/\\~]/.test(word) || /[A-Za-z0-9]\.[A-Za-z]{2,}/.test(word) || /^["'(]?--?[a-z]/.test(word) || !!el.closest('code,kbd,samp');
  const label = (el) => {
    const c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + c;
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const rectsOf = (node, a, b) => {
    range.setStart(node, a);
    range.setEnd(node, b);
    return [...range.getClientRects()].filter((q) => q.width > 0.5);
  };
  for (let node; (node = walker.nextNode()); ) {
    const el = node.parentElement;
    if (!el || !node.data.trim() || hidden(el)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0') continue;
    const all = rectsOf(node, 0, node.length);
    if (!all.length) continue;
    const col = colOf(el);
    const box = contentBox(col);

    if (checkOverflow && !scrollsOrClips(el)) {
      const past = (q) => q.right > box.right + 1 || q.left < box.left - 1;
      // Measure the words themselves: a preserved space that hangs at a line
      // end is invisible and does not count.
      if (all.some(past)) {
        for (const m of node.data.matchAll(/\S+/g)) {
          const q = rectsOf(node, m.index, m.index + m[0].length).find(past);
          if (q) {
            out.overflow.push(`${label(el)} in ${label(col)}: "${m[0].slice(0, 60)}" ${Math.round(q.left)}..${Math.round(q.right)} column=${Math.round(box.left)}..${Math.round(box.right)}`);
            break;
          }
        }
      }
    }

    // Two characters sit on different lines when their tops differ by more
    // than half a line (a fallback glyph can sit a few pixels off).
    const step = Math.max(6, parseFloat(s.fontSize) * 0.6);
    const lines = (rs) => rs.some((q) => Math.abs(q.top - rs[0].top) > step);
    if (!lines(all)) continue;
    const text = node.data;
    for (const m of text.matchAll(/\S+/g)) {
      const word = m[0];
      if (word.length < 2) continue;
      const wr = rectsOf(node, m.index, m.index + word.length);
      if (!wr.length || !lines(wr)) continue;
      const isPath = pathy(el, word);
      const ok = allowed(word, isPath, hostEnd(word));
      let prevTop = null;
      for (let i = 0; i < word.length; i++) {
        const q = rectsOf(node, m.index + i, m.index + i + 1)[0];
        if (!q) continue;
        const top = q.top;
        if (prevTop !== null && Math.abs(top - prevTop) > step && !ok(i)) {
          // The last resort: the segment holding this break, between the
          // nearest allowed break points, is wider than the whole column.
          let a = i;
          while (a > 0 && !ok(a)) a--;
          let b = i;
          while (b < word.length && !ok(b)) b++;
          const seg = rectsOf(node, m.index + a, m.index + b).reduce((sum, r) => sum + r.width, 0);
          if (seg <= box.width - 2) out.breaks.push(`${isPath ? 'path' : 'word'} ${label(el)}: "${word.slice(0, i)}|${word.slice(i)}"`.slice(0, 160));
        }
        prevTop = top;
      }
    }
  }
  // Words the build split into <wbr>-joined pieces (<span class="tok">):
  // each piece is its own text node, so read the word across them and check
  // the break between each pair of pieces by the same rule.
  for (const first of document.querySelectorAll('.tok')) {
    const prev = first.previousSibling;
    if (prev && prev.nodeName === 'WBR' && prev.previousSibling?.classList?.contains('tok')) continue;
    const toks = [first];
    for (let n = first.nextSibling; n && n.nodeName === 'WBR' && n.nextSibling?.classList?.contains('tok'); n = n.nextSibling.nextSibling) toks.push(n.nextSibling);
    if (toks.length < 2 || hidden(first)) continue;
    const word = toks.map((t) => t.textContent).join('');
    const host = hostEnd(word);
    const ok = allowed(word, true, host);
    const box = contentBox(colOf(first));
    const step = Math.max(6, parseFloat(getComputedStyle(first).fontSize) * 0.6);
    let at = 0;
    for (let k = 1; k < toks.length; k++) {
      at += toks[k - 1].textContent.length;
      const a = [...toks[k - 1].getClientRects()].filter((q) => q.width > 0.5).pop();
      const b = [...toks[k].getClientRects()].filter((q) => q.width > 0.5)[0];
      if (!a || !b || Math.abs(b.top - a.top) <= step || ok(at)) continue;
      // The last resort: the scheme and domain alone are wider than the column.
      if (at <= host) {
        let start = 0;
        let seg = 0;
        for (const t of toks) {
          if (start < host) seg += t.getBoundingClientRect().width;
          start += t.textContent.length;
        }
        if (seg > box.width - 2) continue;
      }
      out.breaks.push(`path ${label(first.parentElement)}: "${word.slice(0, at)}|${word.slice(at)}"`.slice(0, 160));
    }
  }
  out.overflow = [...new Set(out.overflow)];
  out.breaks = [...new Set(out.breaks)];
  return out;
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const result = { base, pages: pages.length, overflow: [], breaks: [] };
for (const page of pages) {
  for (const width of [320, 390, 430]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(base + page, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(analyse, width === 320);
    for (const item of r.overflow) result.overflow.push(`${width} ${page} ${item}`);
    for (const item of r.breaks) result.breaks.push(`${width} ${page} ${item}`);
    await ctx.close();
  }
}
await browser.close();
server?.close();

if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(result, null, 2));
const failures = [...result.overflow.map((x) => `overflow ${x}`), ...result.breaks.map((x) => `break ${x}`)];
console.log(`${pages.length} pages at 320, 390 and 430: ${result.overflow.length} overflow, ${result.breaks.length} breaks inside a word`);
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
