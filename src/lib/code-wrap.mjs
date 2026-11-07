// URLs, paths and inline code break only where a reader expects them to
// (taste reviews r8 and r9, 2026-11-06: `--primary` and `work-planner` split
// on a phone, the blog footer's setup link broke as "https://github.c / om",
// "manifest.js / on" on /lab/docs/, and a path ran 36px past its column).
//
// One rule for every URL and path on the site, in code, mono spans, links,
// prose and preformatted blocks alike:
// - A token breaks only right after a "/" or right before the "." of a host
//   or file name: each piece is a span, with a <wbr> between pieces. A piece
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

/** The inner HTML for one token's text (already HTML-escaped). */
export function wrapToken(raw) {
  // Pieces end after a run of slashes ("https://" stays whole), before the
  // dot of a host or file name, before a URL's "?" or "#", or at a space.
  return raw
    .split(/( +)/)
    .map((word) => {
      if (/^ +$/.test(word) || word === '') return word;
      const pieces = word.split(/(?<=\/)(?=[^/])|(?<=[A-Za-z0-9])(?=\.[A-Za-z])|(?<=[^/])(?=[?#][^\s])/);
      // A stub joins its shorter neighbour, so "main/src?ref=<hash>" keeps
      // "main/src" together and "?ref=<hash>" free to move to its own line.
      for (let i; pieces.length > 1 && (i = pieces.findIndex((p) => entityLength(p) < STUB_MIN)) >= 0; ) {
        const prev = i > 0 ? entityLength(pieces[i - 1]) : Infinity;
        const next = i < pieces.length - 1 ? entityLength(pieces[i + 1]) : Infinity;
        if (prev <= next) pieces.splice(i - 1, 2, pieces[i - 1] + pieces[i]);
        else pieces.splice(i, 2, pieces[i] + pieces[i + 1]);
      }
      return pieces
        .map((piece) => `<span class="${entityLength(piece) > NOWRAP_MAX ? 'tok tok-long' : 'tok'}">${piece}</span>`)
        .join('<wbr>');
    })
    .join('');
}

const addClass = (attrs, cls) =>
  /\bclass="/.test(attrs) ? attrs.replace(/\bclass="([^"]*)"/, (_, c) => `class="${c ? `${c} ` : ''}${cls}"`) : `${attrs} class="${cls}"`;

// Elements whose text is never touched, and those already marked.
const RAW = /^(?:script|style|textarea|title|svg|template|noscript|head|math)$/i;
const DONE = /\b(?:code-whole|code-long|tok)\b/;
const TAG = /(<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>)/;
const VOID = /^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

/** Wraps every URL- or path-like word in the text of an HTML fragment. */
function wrapText(html) {
  // Scripts and styles hold "<" that is not a tag; set them aside whole.
  const held = [];
  const parts = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (block) => `\u0000RAW${held.push(block) - 1}\u0000`).split(TAG);
  const skip = []; // [{ name, depth }]
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (!m) continue;
      const [, close, name] = m;
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
    parts[i] = part.replace(/[^\s<>]+/g, (word) => (isPathy(word) ? wrapToken(word) : word));
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
          const next = wrapCode(html);
          if (next !== html) fs.writeFileSync(file, next);
        }
      },
    },
  };
}
