import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist } from './support/dist.mjs';

// Every product page sets its hero lede in the one product-lede style,
// Cormorant at 20px on a phone and 24px from 768px (taste review r9: /butler/
// set its lede in Outfit).
test('every product page uses the shared product-hero lede', () => {
  for (const page of ['desk', 'ouro-md', 'ouro-hx', 'butler']) {
    const html = readDist(`${page}/index.html`);
    const afterH1 = html.slice(html.indexOf('</h1>'));
    const lede = afterH1.match(/<p\b[^>]*class="([^"]*)"/);
    assert.match(lede?.[1] ?? '', /\bproduct-lede\b/, `/${page}/: the first paragraph after the h1 is not the product lede`);
  }
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.product-lede \{\s*font-family: var\(--font-display\);[\s\S]*?font-size: 1\.25rem;/);
  assert.match(css, /@media \(min-width: 768px\) \{ \.product-lede \{ font-size: 1\.5rem; \} \}/);
});

// A tinted section that ends the page fades into the footer meadow instead of
// ending hard above it (taste review r9: the seam on ouro.bot/apps/ouro-md/;
// the home page's "Where to start" section did the same).
test('a tinted last section flows into the meadow', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /main > \[class~="bg-deep\/40"\]:last-child \{ background: linear-gradient\(to bottom, [^;]*transparent\); \}/);
  assert.match(readDist('index.html'), /<section id="try" class="[^"]*\bbg-deep\/40\b/);
  // /lab/model-reviews/ ends on a band that fades in and out from the page,
  // not to opaque void, which sat as a lighter strip above the meadow in light.
  assert.match(readDist('lab/model-reviews/index.html'), /bg-gradient-to-b from-transparent via-deep\/40 to-transparent/);
});
