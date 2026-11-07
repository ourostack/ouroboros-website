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
//    pre or .font-mono) that is not right after a "/" (or before a URL's "?"
//    or "#"); a file name never breaks before its extension (Ari's ruling,
//    taste review r14),
//    any break inside a URL's scheme and domain ("https://github" /
//    ".com/...", "ouroboros" / ".bot/...": taste review r10) except the one
//    Ari allowed in round 11: right after the "//" when the scheme and host
//    together are wider than the column, never inside the host unless it
//    alone is ("https://hermes-agent.nousresearch.com/" at 320), and any
//    break inside an ordinary word that is not after a hyphen; in a heading,
//    not after a hyphen either ("to-" / "do": taste review r11). A word is read
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
    const m = word.match(/^(?:[A-Za-z-]+=)?[("'[<]*((?:[a-z][a-z0-9+.-]*:\/\/)?)((?:[A-Za-z0-9-]+\.)+([A-Za-z]{2,}))(?::\d+)?/);
    if (!m) return 0;
    const [all, scheme, , tld] = m;
    const next = word[all.length];
    if (scheme) return all.length;
    if (!TLD.test(tld) || (next !== '/' && FILE_EXT.test(tld))) return 0;
    if (next !== undefined && !/[/?#:)"'\].,;!&]/.test(next)) return 0;
    return all.length;
  };
  // Allowed: after a "/" or before a URL's "?" or "#", never inside
  // the scheme and domain; in an ordinary word also after a hyphen or dash,
  // before an opening bracket or a dash, and anywhere next to CJK text.
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  // A heading never breaks at a hyphen (taste review r11: "to-" / "do" in
  // the /lab/how-desk-started/ h1 at 320); an en or em dash may still end a line.
  const allowed = (word, isPath, host, inHeading = false) => (i) =>
    i > host &&
    ((word[i - 1] === '/' && word[i] !== '/') || /[?#]/.test(word[i]) ||
      (!isPath && ((inHeading ? /[‒–—]/ : /[-‐-—­]/).test(word[i - 1]) || /[([{‐-—]/.test(word[i]) || cjk.test(word[i - 1]) || cjk.test(word[i]))));
  // A break inside a file name's last segment, before its extension
  // ("latest-ready" / ".json", "https://ouroboros.bot/brief" / ".md"): Ari's
  // ruling, taste review r14, replacing round 11's break before a file
  // name's ".". The last path segment never breaks; only "/" offers a break.
  const extBreak = (word, i) => {
    const seg = word.slice(word.lastIndexOf('/', i - 1) + 1);
    return /\.[A-Za-z][\w-]*/.test(seg.slice(i - (word.length - seg.length))) && FILE_EXT.test((seg.match(/\.([A-Za-z0-9]+)\W*$/) || [])[1] || '') ? ' (before the extension)' : '';
  };
  const headingOf = (el) => el.closest('h1,h2,h3,h4,h5,h6,[class*="heading-"]');
  // Where a word's scheme ends, just after its "//"; 0 without one.
  const schemeEnd = (word) => word.match(/^(?:[A-Za-z-]+=)?[("'[<]*[a-z][a-z0-9+.-]*:\/\//)?.[0].length ?? 0;
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
      const host = hostEnd(word);
      const ok = allowed(word, isPath, host, !!headingOf(el));
      let prevTop = null;
      for (let i = 0; i < word.length; i++) {
        const q = rectsOf(node, m.index + i, m.index + i + 1)[0];
        if (!q) continue;
        const top = q.top;
        if (prevTop !== null && Math.abs(top - prevTop) > step && !ok(i)) {
          // Inside the scheme and host, the last resort is narrower (taste
          // review r11, Ari's ruling): right after the "//" only when the
          // scheme and host together are wider than the column, and inside
          // the host only when the host alone is.
          const scheme = schemeEnd(word);
          if (i <= host) {
            const width = (a, b) => rectsOf(node, m.index + a, m.index + b).reduce((sum, r) => sum + r.width, 0);
            const tooWide = i === scheme ? width(0, host) > box.width - 2 : i > scheme && width(scheme, host) > box.width - 2;
            if (!tooWide) out.breaks.push(`${isPath ? 'path' : 'word'} ${label(el)}: "${word.slice(0, i)}|${word.slice(i)}"${i === scheme ? ' (scheme split from a host that fits with it)' : ' (inside the host)'}`.slice(0, 180));
            prevTop = top;
            continue;
          }
          // The last resort: the segment holding this break, between the
          // nearest allowed break points, is wider than the whole column.
          let a = i;
          while (a > 0 && !ok(a)) a--;
          let b = i;
          while (b < word.length && !ok(b)) b++;
          const seg = rectsOf(node, m.index + a, m.index + b).reduce((sum, r) => sum + r.width, 0);
          if (seg <= box.width - 2) out.breaks.push(`${isPath ? 'path' : 'word'} ${label(el)}: "${word.slice(0, i)}|${word.slice(i)}"${extBreak(word, i)}`.slice(0, 180));
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
      out.breaks.push(`path ${label(first.parentElement)}: "${word.slice(0, at)}|${word.slice(at)}"${extBreak(word, at)}`.slice(0, 180));
    }
  }
  // A long scheme and host (<span class="tok-url">https://<wbr><span
  // class="tok-host">host/</span></span>) may break right after the "//" only
  // when the two together are wider than the column, and the host never
  // breaks unless it alone is (taste review r11, Ari's ruling).
  for (const url of document.querySelectorAll('.tok-url')) {
    const hostEl = url.querySelector('.tok-host');
    if (!hostEl || hidden(url)) continue;
    const range2 = document.createRange();
    range2.selectNodeContents(url.firstChild);
    const s1 = [...range2.getClientRects()].filter((q) => q.width > 0.5);
    const h = [...hostEl.getClientRects()].filter((q) => q.width > 0.5);
    if (!s1.length || !h.length) continue;
    const box = contentBox(colOf(url.parentElement || url));
    const step = Math.max(6, parseFloat(getComputedStyle(url).fontSize) * 0.6);
    const schemeW = s1.reduce((sum, r) => sum + r.width, 0);
    const hostW = hostEl.scrollWidth || h.reduce((sum, r) => sum + r.width, 0);
    const text = url.textContent;
    if (Math.abs(h[0].top - s1[s1.length - 1].top) > step && schemeW + hostW <= box.width - 2) out.breaks.push(`path ${label(url.parentElement)}: "${text.slice(0, url.firstChild.textContent.length)}|${text.slice(url.firstChild.textContent.length)}" (scheme split from a host that fits with it)`);
    if (h.length > 1 && h.some((q) => Math.abs(q.top - h[0].top) > step) && hostW <= box.width - 2) out.breaks.push(`path ${label(url.parentElement)}: "${text}" (inside the host)`);
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
    // Folded excerpts count too (taste review r11's hermes URL sat in one).
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
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
