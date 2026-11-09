// The static fade check: no picture fades into the page or into nothing (Ari,
// 2026-11-08: "none of this 'fade to nothingness' tho for an image"). It fails
// on any gradient mask (CSS mask-image, -webkit-mask-image, mask, -webkit-mask,
// a Tailwind [mask-image:...] class, JSX maskImage or WebkitMaskImage) unless
// the same or the previous line carries `fade-ok: <reason>`. A gradient that
// fades no picture (a tint, a drawn grid) may stay, marked with its reason.
// This is the same rule as Ouro check's fades.ts (ourostack/ouro-ui).
import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_EXTENSIONS = new Set(['.css', '.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.svg', '.vue', '.svelte']);

const PROPERTY = /(?<![\w-])(?:(?:-webkit-)?mask(?:-image)?|WebkitMaskImage|WebkitMask|maskImage)\s*:/g;
const ALLOWED = /fade-ok:\s*[A-Za-z0-9]/;

/** Every gradient mask in `text` without a `fade-ok: <reason>` on its line or the line before, as { line, text }. */
export function scanText(text) {
  const lines = text.split('\n');
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const lineOf = (at) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const found = [];
  for (const m of text.matchAll(PROPERTY)) {
    let value = text.slice(m.index + m[0].length, m.index + m[0].length + 600).replace(/^\s*["'`]?/, '');
    const end = value.search(/[;}\]"'`]/);
    if (end >= 0) value = value.slice(0, end);
    if (!/gradient\s*\(/i.test(value)) continue;
    const line = lineOf(m.index);
    if (ALLOWED.test(lines[line]) || (line > 0 && ALLOWED.test(lines[line - 1]))) continue;
    found.push({ line: line + 1, text: lines[line].trim().slice(0, 160) });
  }
  return found;
}

/** Every unmarked gradient mask in the source files under `dirs`, as "file:line: text". */
export function scanDirs(dirs, { root = process.cwd() } = {}) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        for (const f of scanText(fs.readFileSync(full, 'utf8'))) out.push(`${path.relative(root, full)}:${f.line}: ${f.text}`);
      }
    }
  };
  for (const dir of dirs) walk(path.resolve(root, dir));
  return out;
}
