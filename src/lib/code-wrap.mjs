// URLs, paths and inline code break only where a reader expects them to
// (taste reviews r8 and r9, 2026-11-06: `--primary` and `work-planner` split
// on a phone, the blog footer's setup link broke as "https://github.c / om",
// "manifest.js / on" on /lab/docs/, and a path ran 36px past its column).
//
// One rule for every URL and path on the site, in code, mono spans, links,
// prose and preformatted blocks alike:
// - A URL's scheme and domain never break ("https://github.com/" stays one
//   piece; taste review r10: "https://github" / ".com/..." at 390 and
//   "ouroboros" / ".bot/..." at 320). When the scheme and host are too
//   long to fit a line together, the one break they offer is right after
//   the "//", and the host itself stays whole (taste review r11:
//   "https://hermes-agent.nousresearch.com/" split inside the host at 320).
//   After it, a token breaks only right
//   after a "/" or right before the "." of a file name: each piece is a
//   span, with a <wbr> between pieces. A piece
//   under STUB_MIN characters joins its neighbour, so no line starts or ends
//   on a lone "~/" or "on".
// - A piece of NOWRAP_MAX characters or fewer never breaks ("tok",
//   white-space: nowrap). A longer piece ("tok tok-long", an inline-block as
//   wide as its column at most) moves to the next line whole when it fits
//   there, and breaks inside only when it is wider than the whole column, a
//   commit hash at 320 (overflow-wrap: anywhere, the one last resort).
// - Inline code of WHOLE_MAX characters or fewer stays whole ("code-whole"),
//   and so does a command-line flag anywhere ("--no-monorepo").
//
// Runs over the built HTML (astro.config.mjs, astro:build:done), so it covers
// every page, the .astro pages and the model text that src/lib/md.mjs renders
// alike. Copying the text is unchanged: <wbr> and spans add no characters.
// scripts/text-breaks.mjs checks the result in a real browser.
import fs from 'node:fs';
import { glueArrows } from './glue-arrows.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WHOLE_MAX = 16;
const NOWRAP_MAX = 16;
const STUB_MIN = 4;
const PATH_MIN = 12;

const entityLength = (raw) => raw.replace(/&#?[a-z0-9]+;/gi, 'x').length;

/** Is this whitespace-free word (HTML-escaped) a URL, path, host or file name? */
export function isPathy(word) {
  if (/^["'(]?--?[A-Za-z][\w-]{2,}/.test(word)) return true;
  if (entityLength(word) < PATH_MIN) return false;
  return /[^\s/]\/[^\s/]|\/\/|^[("'[]*~?\//.test(word) || /[A-Za-z0-9]\.[A-Za-z]{2,}/.test(word);
}

// A file name's extension, which tells "manifest.json" from a domain like "ouro.bot".
const FILE_EXT = /^(?:md|mdx|json|jsonc|jsonl|mjs|cjs|js|ts|tsx|jsx|html?|css|txt|ya?ml|sh|astro|png|jpe?g|webp|avif|gif|svg|toml|lock|plist|swift|py|rb|go|rs|zip|gz|tgz|pdf|xml|log|env|cfg|ini|conf|webmanifest|csv|wasm|dmg|pkg)$/i;
const TLD = /^(?:com|org|net|io|dev|ai|app|bot|me|co|gg|xyz|so|to|us|uk|ca|de|fr|jp|ly|tv|fm|page|site|cloud|tech|run|build|link|blog|news|codes|tools|works|world|email|edu|gov|info)$/i;

/**
 * Where a word's scheme and domain end ("https://github.com" in
 * "https://github.com/o/x", "ouroboros.bot" in "ouroboros.bot/brief.md"), as
 * an index into the word; 0 when it starts with neither. Without a scheme,
 * only a known top-level domain counts, and a bare "name.ext"
 * with a file extension and nothing after it is a file name, not a domain.
 * scripts/text-breaks.mjs holds the same rule in the browser.
 */
export function hostEnd(word) {
  // The word is HTML-escaped: a leading quote arrives as "&quot;". An
  // attribute name may come first, as in quoted markup: href="https://...".
  const m = word.match(/^(?:[A-Za-z-]+=)?(?:[("'[<]|&quot;|&#39;|&#x27;|&lt;)*((?:[a-z][a-z0-9+.-]*:\/\/)?)((?:[A-Za-z0-9-]+\.)+([A-Za-z]{2,}))(?::\d+)?/);
  if (!m) return 0;
  const [all, scheme, , tld] = m;
  const next = word[all.length];
  if (scheme) return all.length;
  // Without a scheme, only a known top-level domain makes a domain
  // ("client.chat.completions" is code), and a file extension with nothing
  // after it makes a file name ("install.sh").
  if (!TLD.test(tld) || (next !== '/' && FILE_EXT.test(tld))) return 0;
  if (next !== undefined && !/[/?#:)"'\].,;!<>&]/.test(next)) return 0;
  return all.length;
}

/** Where a word's scheme ends, just after its "//" ("https://" in "https://x.io/a"); 0 when it has none. */
export function schemeEnd(word) {
  const m = word.match(/^(?:[A-Za-z-]+=)?(?:[("'[<]|&quot;|&#39;|&#x27;|&lt;)*[a-z][a-z0-9+.-]*:\/\//);
  return m ? m[0].length : 0;
}

// Character references in the token's HTML (taste review r14: the old
// splitter cut "&#123;" before its "#" and readers saw "&#123;", "&#125;" and
// "&#39;" in code). A token is decoded to the text a reader sees, split and
// measured as text, and each piece is escaped again on the way out, so a
// break can never fall inside a reference. A named reference this table does
// not know is held as one private-use character and restored unchanged.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi;
const HELD_BASE = 0xf0000;

/** Decodes an HTML text fragment. Returns the text and the references it could not decode. */
export function decodeEntities(html) {
  const held = [];
  const text = html.replace(ENTITY, (ref, dec, hex, name) => {
    const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : undefined;
    if (code !== undefined && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
    if (name && Object.hasOwn(NAMED, name.toLowerCase()) && name === name.toLowerCase()) return NAMED[name];
    return String.fromCodePoint(HELD_BASE + held.push(ref) - 1);
  });
  return { text, held };
}

/** Escapes text for an HTML text node, restoring any held references. */
export function escapeText(text, held = []) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\u{f0000}-\u{ffffd}]/gu, (c) => held[c.codePointAt(0) - HELD_BASE] ?? '');
}

/** The inner HTML for one token's text (already HTML-escaped). */
export function wrapToken(raw) {
  const { text, held } = decodeEntities(raw);
  const esc = (t) => escapeText(t, held);
  // The scheme and domain are one piece, with the slash after them. Then
  // pieces end after a run of slashes, before a URL's "?" or "#", or at a
  // space. A file name with its extension is one piece and never breaks
  // before its "." (Ari's ruling, taste review r14, replacing round 11's
  // break before a file name's dot: "latest-ready" / ".json" read as two
  // words). Only a piece wider than its whole column breaks inside, the one
  // last resort.
  return text
    .split(/( +)/)
    .map((word) => {
      if (/^ +$/.test(word) || word === '') return word;
      let head = word.slice(0, hostEnd(word));
      if (head) head += word.slice(head.length).match(/^\/*/)[0];
      const rest = word.slice(head.length);
      const pieces = rest ? rest.split(/(?<=\/)(?=[^/])|(?<=[^/])(?=[?#][^\s])/) : [];
      if (head) pieces.unshift(head);
      // A stub joins its shorter neighbour, so "main/src?ref=<hash>" keeps
      // "main/src" together and "?ref=<hash>" free to move to its own line.
      for (let i; pieces.length > 1 && (i = pieces.findIndex((p) => [...p].length < STUB_MIN)) >= 0; ) {
        const prev = i > 0 ? [...pieces[i - 1]].length : Infinity;
        const next = i < pieces.length - 1 ? [...pieces[i + 1]].length : Infinity;
        if (prev <= next) pieces.splice(i - 1, 2, pieces[i - 1] + pieces[i]);
        else pieces.splice(i, 2, pieces[i] + pieces[i + 1]);
      }
      return pieces
        .map((piece, i) => {
          if ([...piece].length <= NOWRAP_MAX) return `<span class="tok">${esc(piece)}</span>`;
          // A scheme and host too long to promise a line together (taste
          // review r11: "https://hermes-agent.nousresearch.com/" split inside
          // the host at 320) offer one break, right after the "//", and keep
          // the host itself whole. The piece is an inline-block, so it moves
          // to the next line whole whenever the scheme and host fit there
          // together; it breaks after the "//" only when they do not.
          const scheme = i === 0 && head ? schemeEnd(piece) : 0;
          if (scheme) return `<span class="tok tok-long tok-url">${esc(piece.slice(0, scheme))}<wbr><span class="tok-host">${esc(piece.slice(scheme))}</span></span>`;
          return `<span class="tok tok-long">${esc(piece)}</span>`;
        })
        .join('<wbr>');
    })
    .join('');
}

const addClass = (attrs, cls) =>
  /\bclass="/.test(attrs) ? attrs.replace(/\bclass="([^"]*)"/, (_, c) => `class="${c ? `${c} ` : ''}${cls}"`) : `${attrs} class="${cls}"`;

// Elements whose text is never touched, and those already marked.
const RAW = /^(?:script|style|textarea|title|svg|template|noscript|head|math)$/i;
const DONE = /\b(?:code-whole|code-long|tok|nobr)\b/;
const HEADING = /^h[1-6]$/i;
// A hyphenated word in a heading ("to-do", "follow-up"). A heading never
// breaks at its hyphen (taste review r11: the /lab/how-desk-started/ h1 broke
// as "to-" / "do" at 320); the word is held whole in a .nobr span, which
// keeps the font's own hyphen. (A real non-breaking hyphen, U+2011, is not in
// the self-hosted Cormorant, Outfit or JetBrains Mono, so it would render in
// a fallback face.)
const HYPHENATED = /[\p{L}\p{N}][-\u2010][\p{L}\p{N}]/u;
const TAG = /(<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>)/;
const VOID = /^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

/** Wraps every URL- or path-like word in the text of an HTML fragment. */
function wrapText(html) {
  // Scripts and styles hold "<" that is not a tag; set them aside whole.
  const held = [];
  const parts = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (block) => `\u0000RAW${held.push(block) - 1}\u0000`).split(TAG);
  const skip = []; // [{ name, depth }]
  let heading = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (!m) continue;
      const [, close, name] = m;
      if (HEADING.test(name)) heading = Math.max(0, heading + (close ? -1 : 1));
      const top = skip[skip.length - 1];
      if (close) {
        if (top && top.name === name.toLowerCase()) top.depth ? top.depth-- : skip.pop();
      } else if (!VOID.test(name) && !part.endsWith('/>')) {
        if (top && top.name === name.toLowerCase()) top.depth++;
        else if (RAW.test(name) || DONE.test(part.match(/\bclass="([^"]*)"/)?.[1] ?? '')) skip.push({ name: name.toLowerCase(), depth: 0 });
      }
      continue;
    }
    if (skip.length || !part.trim()) continue;
    parts[i] = part.replace(/[^\s<>]+/g, (word) =>
      isPathy(word) ? wrapToken(word) : heading && HYPHENATED.test(word) ? `<span class="nobr">${word}</span>` : word,
    );
  }
  return parts.join('').replace(/\u0000RAW(\d+)\u0000/g, (_, i) => held[Number(i)]);
}

/** Rewrites one page: inline code, transcript URLs, then every URL and path. */
export function wrapCode(html) {
  // Inline code first (code inside <pre> is preformatted text, handled below).
  const held = [];
  let out = html.replace(/<pre\b[\s\S]*?<\/pre>/gi, (block) => `\u0000PRE${held.push(block) - 1}\u0000`);
  const rewrite = (tag, attrs, text, close) => {
    if (/\bcode-(?:whole|long)\b/.test(attrs)) return `<${tag}${attrs}>${text}${close}`;
    if (entityLength(text) <= WHOLE_MAX) return `<${tag}${addClass(attrs, 'code-whole')}>${text}${close}`;
    return `<${tag}${addClass(attrs, 'code-long')}>${wrapToken(text)}${close}`;
  };
  out = out.replace(/<(code)\b([^>]*)>([^<]+)(<\/code>)/gi, (_, tag, attrs, text, close) => rewrite(tag, attrs, text, close));
  out = out.replace(/<(span)\b([^>]*\bfetch-url\b[^>]*)>([^<]+)(<\/span>)/gi, (_, tag, attrs, text, close) => rewrite(tag, attrs, text, close));
  out = out.replace(/\u0000PRE(\d+)\u0000/g, (_, i) => held[Number(i)]);
  return wrapText(out);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

/** The Astro integration. */
export default function codeWrap() {
  return {
    name: 'code-wrap',
    hooks: {
      'astro:build:done': ({ dir }) => {
        for (const file of htmlFiles(fileURLToPath(dir))) {
          const html = fs.readFileSync(file, 'utf8');
          const next = glueArrows(wrapCode(html));
          if (next !== html) fs.writeFileSync(file, next);
        }
      },
    },
  };
}
