import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readDist, listHtmlFiles, distDir, distExists } from './support/dist.mjs';

test('normal logo placements use the approved rich renders, not the old vector marks', () => {
  const home = readDist('index.html');
  assert.match(home, /<img\b[^>]*src="\/brand\/ouro-render\.webp"[^>]*class="[^"]*brand-mark/);
  assert.match(home, /id="ouroboros"[\s\S]*?class="product-title"[^>]*>[\s\S]*?src="\/brand\/ouro-render\.webp"/);
  assert.match(home, /id="desk"[\s\S]*?class="product-title"[^>]*>[\s\S]*?src="\/brand\/desk-render\.webp"/);
  assert.match(readDist('desk/index.html'), /src="\/brand\/desk-render\.webp"/);
  assert.match(readDist('lab/story/index.html'), /src="\/brand\/ouro-render\.webp"/);
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /(?:ouro-badge|ouro-silhouette|ouro-character|desk-icon)\.svg|\/images\/ouroboros\.svg/, file);
    if (/http-equiv="refresh"/.test(html)) continue;
    assert.match(html, /rel="icon"[^>]*href="\/brand\/ouro\.svg"/);
  }
});

test('HD logo exports ship responsive lossless images and one small-use SVG per mark', () => {
  for (const mark of ['ouro', 'desk']) {
    for (const suffix of ['', '-128', '-256']) {
      const file = `brand/${mark}-render${suffix}.webp`;
      assert.ok(distExists(file), file);
      const bytes = fs.readFileSync(path.join(distDir, file));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.equal(bytes.toString('ascii', 12, 16), 'VP8L');
      assert.notEqual(bytes.readUInt32LE(21) & 0x10000000, 0, `${file} has alpha`);
    }
    const svg = fs.readFileSync(path.join(distDir, `brand/${mark}.svg`), 'utf8');
    assert.equal((svg.match(/<path\b/g) || []).length, 1);
    assert.doesNotMatch(svg, /<(?:circle|ellipse|image|mask|clipPath)\b/);
  }
});

test('the snake hover moves clockwise and is enabled only without reduced motion', () => {
  const nav = fs.readFileSync(new URL('../src/components/Nav.astro', import.meta.url), 'utf8');
  assert.match(nav, /@media[^{]*prefers-reduced-motion:\s*no-preference/);
  assert.match(nav, /\.brand-home:hover \.brand-mark\s*\{\s*transform:\s*rotate\(25deg\)/);
  assert.doesNotMatch(nav, /rotate\(\s*-|rotate-\[-/);
});

test('the Spoonjoy card shows its existing mark in the heading, with theme-aware colour', () => {
  const home = readDist('index.html');
  const card = home.match(/<article\b[^>]*id="spoonjoy"[\s\S]*?<\/article>/)[0];
  assert.match(card, /<h3 class="product-title"[^>]*><span class="spoonjoy-mark[^"]*"[^>]*aria-hidden="true"[^>]*><\/span>Spoonjoy<\/h3>/);
  assert.ok(distExists('brand/spoonjoy.svg'));
  const svg = fs.readFileSync(path.join(distDir, 'brand/spoonjoy.svg'), 'utf8');
  assert.match(svg, /viewBox="0 0 500 300"/);
  assert.match(svg, /fill-rule="evenodd"/);
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.spoonjoy-mark\s*\{[^}]*background-color:\s*currentColor/);
  assert.match(css, /mask:\s*url\(['"]?\/brand\/spoonjoy\.svg/);
});
