// Inline code and transcript URLs break only where a reader expects them to
// (taste review r8, 2026-11-06: `--primary`, `work-planner` and `npm run dev`
// split across lines on a phone, and transcript URLs left a lone "s").
//
// - A short token (WHOLE_MAX characters or fewer) never breaks: class
//   "code-whole", white-space: nowrap.
// - A longer one breaks only after a "/" or at a space: class "code-long",
//   each piece a nowrap span with a <wbr> after every "/". A piece under
//   STUB_MIN characters joins the next one, so no line starts or ends on a
//   lone "~/". A single piece too long for a 320px column ("tok-long", a
//   commit hash) may still break anywhere, so nothing ever overflows.
//
// Runs over the built HTML (astro.config.mjs, astro:build:done), so it covers
// every page, the .astro pages and the model text that src/lib/md.mjs renders
// alike. Code inside <pre> is left alone. Copying the text is unchanged:
// <wbr> and spans add no characters.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WHOLE_MAX = 24;
const PIECE_MAX = 32;
const STUB_MIN = 4;

const entityLength = (raw) => raw.replace(/&#?[a-z0-9]+;/gi, 'x').length;

/** The inner HTML for one token's text (already HTML-escaped). */
export function wrapToken(raw) {
  // Pieces end after a run of slashes ("https://" stays whole) or at a space.
  const words = raw.split(/( +)/);
  return words
    .map((word) => {
      if (/^ +$/.test(word) || word === '') return word;
      const pieces = [];
      for (const piece of word.split(/(?<=\/)(?=[^/])/)) {
        const last = pieces.length - 1;
        if (last >= 0 && entityLength(pieces[last]) < STUB_MIN) pieces[last] += piece;
        else pieces.push(piece);
      }
      if (pieces.length > 1 && entityLength(pieces[pieces.length - 1]) < STUB_MIN) pieces[pieces.length - 2] += pieces.pop();
      return pieces
        .map((piece) => `<span class="${entityLength(piece) > PIECE_MAX ? 'tok tok-long' : 'tok'}">${piece}</span>`)
        .join('<wbr>');
    })
    .join('');
}

const addClass = (attrs, cls) =>
  /\bclass="/.test(attrs) ? attrs.replace(/\bclass="([^"]*)"/, (_, c) => `class="${c ? `${c} ` : ''}${cls}"`) : `${attrs} class="${cls}"`;

/** Rewrites one page's inline code and transcript URLs. */
export function wrapCode(html) {
  // Leave preformatted blocks exactly as they are.
  const held = [];
  let out = html.replace(/<pre\b[\s\S]*?<\/pre>/gi, (block) => `\u0000PRE${held.push(block) - 1}\u0000`);
  const rewrite = (tag, attrs, text, close) => {
    if (/\bcode-(?:whole|long)\b/.test(attrs)) return `<${tag}${attrs}>${text}${close}`;
    if (entityLength(text) <= WHOLE_MAX) return `<${tag}${addClass(attrs, 'code-whole')}>${text}${close}`;
    return `<${tag}${addClass(attrs, 'code-long')}>${wrapToken(text)}${close}`;
  };
  out = out.replace(/<(code)\b([^>]*)>([^<]+)(<\/code>)/gi, (_, tag, attrs, text, close) => rewrite(tag, attrs, text, close));
  out = out.replace(/<(span)\b([^>]*\bfetch-url\b[^>]*)>([^<]+)(<\/span>)/gi, (_, tag, attrs, text, close) => rewrite(tag, attrs, text, close));
  return out.replace(/\u0000PRE(\d+)\u0000/g, (_, i) => held[Number(i)]);
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
