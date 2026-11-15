import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readDist, listHtmlFiles, distDir, distExists } from './support/dist.mjs';

test('normal logo placements use the approved rich renders, not the old vector marks', () => {
  const home = readDist('index.html');
  assert.match(home, /<img\b[^>]*src="\/brand\/ouro-render\.webp"[^>]*class="[^"]*brand-mark/);
  assert.match(home, /id="ouroboros-heading" class="heading-section heading-mark"[^>]*><img src="\/brand\/ouro-render\.webp"/);
  // Fewer snakes (Ari, 2026-11-14: "i'm drowning in ouro the snake"): each tool shows its real product, and
  // what grew inside Ouroboros is words under the harness's one scene, so neither carries a scene of its own.
  const tools = home.match(/<div class="tools"[\s\S]*?<\/section>/)[0];
  assert.match(tools, /<h3 class="tool-name"[^>]*>Desk<\/h3>/);
  assert.doesNotMatch(tools, /data-brand-scene/);
  const grown = home.match(/<ul class="grown"[\s\S]*?<\/ul>/)[0];
  for (const id of ['friends', 'shepherd', 'butler']) assert.match(grown, new RegExp(`<li id="${id}"`));
  assert.doesNotMatch(grown, /data-brand-scene/);
  assert.match(readDist('desk/index.html'), /src="\/brand\/desk-render\.webp"/);
  assert.match(readDist('lab/story/index.html'), /src="\/brand\/ouro-render\.webp"/);
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /(?:ouro-badge|ouro-silhouette|ouro-character|desk-icon)\.svg|\/images\/ouroboros\.svg/, file);
    if (/http-equiv="refresh"/.test(html)) continue;
    assert.match(html, /rel="icon"[^>]*href="\/brand\/ouro\.svg"/);
  }
});

test('HD logo exports ship responsive lossless images, and Desk one flat small-use SVG', () => {
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
  }
  // Desk's small-use mark is one flat path. Ouro's is the family favicon, with his face since
  // ourostack/.github#109; tests/storybook.test.mjs holds it to brand/icons/ouro.svg byte for byte.
  const desk = fs.readFileSync(path.join(distDir, 'brand/desk.svg'), 'utf8');
  assert.equal((desk.match(/<path\b/g) || []).length, 1);
  assert.doesNotMatch(desk, /<(?:circle|ellipse|image|mask|clipPath)\b/);
});

test('the snake hover moves clockwise and is enabled only without reduced motion', () => {
  const nav = fs.readFileSync(new URL('../src/components/Nav.astro', import.meta.url), 'utf8');
  assert.match(nav, /@media[^{]*prefers-reduced-motion:\s*no-preference/);
  assert.match(nav, /\.brand-home:hover \.brand-mark\s*\{\s*transform:\s*rotate\(25deg\)/);
  assert.doesNotMatch(nav, /rotate\(\s*-|rotate-\[-/);
});

test('the Spoonjoy mark ships with theme-aware colour', () => {
  assert.ok(distExists('brand/spoonjoy.svg'));
  const svg = fs.readFileSync(path.join(distDir, 'brand/spoonjoy.svg'), 'utf8');
  assert.match(svg, /viewBox="0 0 500 300"/);
  assert.match(svg, /fill-rule="evenodd"/);
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.spoonjoy-mark\s*\{[^}]*background-color:\s*currentColor/);
  assert.match(css, /mask:\s*url\(['"]?\/brand\/spoonjoy\.svg/);
});
