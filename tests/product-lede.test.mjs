import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist } from './support/dist.mjs';

// Every product page sets its hero lede in the one product-lede style,
// Cormorant at 20px on a phone and 24px from 768px (taste review r9: /butler/
// set its lede in Outfit).
test('every product page uses the shared product-hero lede', () => {
  for (const page of ['desk', 'ouro-md', 'butler', 'housesitter', 'apps', 'ouro-md/download']) {
    const html = readDist(`${page}/index.html`);
    const afterH1 = html.slice(html.indexOf('</h1>'));
    const lede = afterH1.match(/<p\b[^>]*class="([^"]*)"/);
    assert.match(lede?.[1] ?? '', /\bproduct-lede\b/, `/${page}/: the first paragraph after the h1 is not the product lede`);
  }
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.product-lede \{\s*font-family: var\(--font-display\);[\s\S]*?font-size: 1\.25rem;/);
  assert.match(css, /@media \(min-width: 768px\) \{ \.product-lede \{ font-size: 1\.5rem; \} \}/);
});

// A tinted section that ends the page meets the footer meadow directly, on a
// hard edge the meadow's trail marks, so no strip of page colour sits between
// them (taste review r9) and nothing fades (Ari, 2026-11-08).
test('a tinted last section meets the meadow on a clean edge', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /main:has\(> \[class~="bg-deep\/40"\]:last-child\) \+ \.story-meadow \{ margin-top: 0; \}/);
  assert.doesNotMatch(css, /main > \[class~="bg-deep\/40"\]:last-child \{ background: linear-gradient/);
  assert.match(readDist('index.html'), /<section id="try" class="[^"]*\bbg-deep\/40\b/);
  // /lab/model-reviews/ ends on the flat page ground, with no gradient wash
  // behind its last section to sit as a strip above the meadow (taste review
  // r16, 2026-11-07: no gradient washes outside the scene art; check:seams
  // measures the join).
  assert.doesNotMatch(readDist('lab/model-reviews/index.html'), /bg-gradient-to-b from-transparent via-deep\/\d+ to-transparent/);
});
