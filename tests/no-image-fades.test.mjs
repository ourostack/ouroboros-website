import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { findFades, scan, SCANNED } from '../lib/ouro/check/fades.ts';

// No picture on the site fades into the page or into nothing, at any edge
// (Ari, 2026-11-08). Ouro check's fade scan (lib/ouro/check/fades.ts, from
// ouro-ui's ouro-check item) reads every source file in src/ and public/ and
// fails on a gradient mask unless its line, or a comment on the line before,
// says `fade-ok: <reason>`: a tint, a drawn grid or a scrolling row of words
// that fades no picture. Runs in site-checks (npm test), the check that gates
// merges.
const DIRS = ['src', 'public'];

// Files the scan reads only when named: SVGs can carry a style mask too.
function extraFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full);
      } else if (['.svg', '.cjs'].includes(path.extname(entry.name))) out.push(full);
    }
  };
  for (const dir of DIRS) walk(dir);
  return out;
}

// This site's one addition: a mask whose value is a var() can hold a gradient
// the scan can't see (the heroes' old --hero-fade did), so it needs a reason too.
const VAR_MASK = /(?<![\w-])(?:(?:-webkit-)?mask(?:-image)?|maskImage|WebkitMaskImage)\s*:\s*["'`]?var\(/g;
const optsOut = (line) => /fade-ok:\s*\p{L}/u.test(line ?? '');
function varMasks(text, file) {
  const lines = text.split('\n');
  const found = [];
  for (const m of text.matchAll(VAR_MASK)) {
    const line = text.slice(0, m.index).split('\n').length;
    if (!optsOut(lines[line - 1]) && !optsOut(lines[line - 2])) found.push({ file, line, declaration: lines[line - 1].trim() });
  }
  return found;
}

test('no gradient mask in src/ or public/ without a fade-ok reason (Ouro check)', async () => {
  const fades = await scan([...DIRS, ...extraFiles()], process.cwd());
  assert.deepEqual(fades.map((f) => `${f.file}:${f.line}: ${f.declaration}`), [], 'A picture fades: give it a hard edge, or mark an artistic gradient with fade-ok: <reason>');
});

test('no mask in src/ or public/ takes its value from a var() without a fade-ok reason', async () => {
  const files = (await Promise.all(DIRS.map((dir) => fs.promises.readdir(dir, { recursive: true }))))
    .flatMap((names, i) => names.map((name) => path.join(DIRS[i], name)))
    .filter((file) => [...SCANNED, '.svg', '.cjs'].includes(path.extname(file)) && !file.split(path.sep).includes('node_modules'));
  const found = files.flatMap((file) => varMasks(fs.readFileSync(file, 'utf8'), file));
  assert.deepEqual(found.map((f) => `${f.file}:${f.line}: ${f.declaration}`), []);
});

// Tailwind scans this file for class names, so the class strings below are
// built in pieces: written whole, they would compile into the site's CSS.
const tw = (...parts) => parts.join('');
const flagged = (text) => findFades(text, 'planted').length + varMasks(text, 'planted').length;

test('the fade scan catches every form of gradient mask, and honours fade-ok', () => {
  const planted = [
    '.hero { mask-image: linear-gradient(to bottom, #000 70%, transparent); }',
    '.hero { -webkit-mask-image: radial-gradient(circle, #000, transparent); }',
    '.hero { mask: linear-gradient(#000, transparent) center / cover; }',
    '.hero { -webkit-mask: linear-gradient(#000, transparent); }',
    `<div class="${tw('[mask', '-image:linear-gradient(to_bottom,black,transparent)]')}"></div>`,
    '<img style={{ maskImage: "linear-gradient(black, transparent)" }} />',
    '<img style={{ WebkitMaskImage: `linear-gradient(black, transparent)` }} />',
    '.hero {\n  mask-image:\n    linear-gradient(to bottom, #000 70%, transparent);\n}',
    `<img class="w-full ${tw('mask', '-b-from-70%')}" />`,
    `<div class="${tw('mask', '-linear-[to_bottom,black,transparent]')}"></div>`,
    `<div class="${tw('md:mask', '-radial-from-60%')}"></div>`,
    '.hero { mask-image: var(--fade); }',
    '.hero { mask-image: url("/brand/x.svg"), linear-gradient(#000, transparent); }',
  ];
  for (const text of planted) assert.equal(flagged(text), 1, `missed: ${text}`);
  const allowed = [
    '/* fade-ok: a flat tint, no picture */\n.band { mask-image: linear-gradient(#000, transparent); }',
    '.band { mask-image: linear-gradient(#000, transparent); } /* fade-ok: a drawn grid */',
    '.logo { mask: url(/brand/mark.svg) center / contain no-repeat; }',
    '.logo { mask-size: contain; mask-image: url(/mark.svg); }',
    `<div class="${tw('mask', '-type-alpha')}"></div>`,
    `<div style="mask: url(/a.svg) center" class="${tw('bg-[linear', '-gradient(red,blue)]')}"></div>`,
    '.trail { background: linear-gradient(90deg, transparent, gold, transparent); }',
  ];
  for (const text of allowed) assert.equal(flagged(text), 0, `flagged: ${text}`);
  // A reason is required, not just the marker.
  assert.equal(flagged('/* fade-ok: */\n.x { mask-image: linear-gradient(#000, transparent); }'), 1);
});
