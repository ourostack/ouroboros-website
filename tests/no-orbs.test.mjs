import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { listHtmlFiles, distDir } from './support/dist.mjs';

// No decorative orbs, blobs or gradient washes outside the scene art (taste
// review r16, 2026-11-07: a faint blurred green orb behind /approach/ at 1440
// in light read as a smudge). The scenes are pictures; the ground under them
// is flat, tinted only by ground bands. Decoration that draws itself (the
// glowing trail, the ring's own SVG halo, timeline hairlines) stays.
//
// Fails on: a blurred element (filter blur, not a frosted backdrop), a layer
// that covers its box with a gradient (inset plus bg-gradient), a radial
// gradient in the built CSS, and the old glow and halo class names.

const pages = listHtmlFiles().map((file) => [path.relative(distDir, file), fs.readFileSync(file, 'utf8')]);
const css = fs.readdirSync(path.join(distDir, '_astro')).filter((f) => f.endsWith('.css'))
  .map((f) => [f, fs.readFileSync(path.join(distDir, '_astro', f), 'utf8')]);

test('no blurred or gradient-wash layer on any page', () => {
  const found = [];
  for (const [page, html] of pages) {
    for (const [, cls] of html.matchAll(/\bclass="([^"]*)"/g)) {
      const names = cls.split(/\s+/);
      const blurred = names.some((n) => /^(?:[a-z]+:)*blur(?:-|$)/.test(n));
      const wash = names.some((n) => /^(?:[a-z]+:)*inset-/.test(n)) && names.some((n) => /^(?:[a-z]+:)*bg-(?:gradient|radial)/.test(n));
      const glow = names.some((n) => /^(?:hero-cover-glow|hero-cover-halo|orb|blob)$/.test(n));
      if (blurred || wash || glow) found.push(`${page}: ${cls.slice(0, 100)}`);
    }
  }
  assert.deepEqual([...new Set(found)], [], 'A decorative orb, blob or gradient wash is back');
});

test('no radial-gradient glow in the built CSS', () => {
  const found = [];
  for (const [file, text] of css) {
    for (const m of text.matchAll(/([^{}]*)\{[^}]*radial-gradient/g)) found.push(`${file}: ${m[1].trim().slice(0, 80)}`);
  }
  assert.deepEqual(found, [], 'A radial-gradient glow is back');
});
