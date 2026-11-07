// An arrow is always glued to the word before it (Ari's ruling on taste
// review r17, 2026-11-07: at 390 the closing "→" of the docs exit links
// dropped onto a line of its own). The space in front of an arrow becomes a
// no-break space, whether the arrow sits in the same run of text ("The full
// story →") or in an inline element of its own ("Ouroboros? <span>→</span>").
// An arrow that opens a run ("← Lab") is glued to the word after it instead.
// An arrow between two words ("Clawdbot → Moltbot") still lets the line break
// after it.
//
// Runs over the built HTML with code-wrap (astro.config.mjs), so it covers
// every page alike. scripts/line-ends.mjs checks the result in a
// real browser at 320, 390 and 430.

// The arrows: the Arrows block (U+2190 to U+21FF) and the long arrows, as a
// character or as an entity.
const ARROW_CHAR = '[\\u2190-\\u21ff\\u27f5-\\u27ff]';
const ARROW_ENTITY = '&(?:[a-zA-Z]*arr|[a-zA-Z]*Arrow[a-zA-Z]*|[a-zA-Z]*arrow);|&#(?:8[5-6]\\d\\d|x21[0-9a-fA-F]{2});';
const ARROW = `(?:${ARROW_CHAR}|${ARROW_ENTITY})`;
const STARTS_WITH_ARROW = new RegExp(`^(\\s*)${ARROW}`);
const SPACE_BEFORE_ARROW = new RegExp(`([^\\s])[ \\t\\r\\n]+(?=${ARROW})`, 'g');
const OPENING_ARROW = new RegExp(`^(\\s*${ARROW})[ \\t\\r\\n]+(?=[^\\s])`);
const NBSP = '&nbsp;';

const TAG = /(<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>)/;
// Elements whose text is never touched.
const RAW = /^(?:script|style|textarea|title|svg|template|noscript|head|math|pre|code)$/i;
// Inline elements an arrow may sit in, apart from the word before it.
const INLINE = /^<\/?(?:span|a|em|strong|b|i|small|abbr|kbd|mark|wbr|code)\b/i;

/** Glues every arrow in the text of an HTML page to its word. */
export function glueArrows(html) {
  const held = [];
  const parts = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (block) => `\u0000RAW${held.push(block) - 1}\u0000`).split(TAG);
  const skip = [];
  const live = new Array(parts.length).fill(false);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (!m) continue;
      const [, close, name] = m;
      const top = skip[skip.length - 1];
      if (close) {
        if (top && top.name === name.toLowerCase()) top.depth ? top.depth-- : skip.pop();
      } else if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i.test(name) && !part.endsWith('/>')) {
        if (top && top.name === name.toLowerCase()) top.depth++;
        else if (RAW.test(name)) skip.push({ name: name.toLowerCase(), depth: 0 });
      }
      continue;
    }
    if (skip.length) continue;
    live[i] = true;
    parts[i] = part.replace(SPACE_BEFORE_ARROW, `$1${NBSP}`).replace(OPENING_ARROW, `$1${NBSP}`);
  }
  // An arrow that starts a run of text after inline tags: glue it to the
  // last word before those tags.
  for (let i = 2; i < parts.length; i += 2) {
    if (!live[i]) continue;
    const lead = parts[i].match(STARTS_WITH_ARROW);
    if (!lead) continue;
    let j = i - 1;
    while (j > 0 && INLINE.test(parts[j]) && parts[j - 1] === '') j -= 2;
    if (j < 1 || !INLINE.test(parts[j])) continue;
    const before = j - 1;
    const trailing = parts[before].match(/[ \t\r\n]+$/);
    // A run of only spaces counts when an inline element ends just before it
    // ("<span>ouroboros.bot</span> <span>→</span>"), never after a block.
    const wordBefore = /\S/.test(parts[before]) || (before > 0 && INLINE.test(parts[before - 1]) && parts[before - 1].startsWith('</'));
    if (trailing && live[before] && wordBefore) {
      parts[before] = parts[before].slice(0, -trailing[0].length) + NBSP;
      if (lead[1]) parts[i] = parts[i].slice(lead[1].length);
    } else if (lead[1] && (/\S$/.test(parts[before]) || parts[before].endsWith(NBSP))) {
      parts[i] = (parts[before].endsWith(NBSP) ? '' : NBSP) + parts[i].slice(lead[1].length);
    }
  }
  return parts.join('').replace(/\u0000RAW(\d+)\u0000/g, (_, i) => held[Number(i)]);
}
