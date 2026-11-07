import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, listHtmlFiles } from './support/dist.mjs';

// Product screenshots follow the theme (Ari's ruling on taste review r19,
// 2026-11-07: the Hosted Desk screenshot on /desk/ was a 1152x772 light slab
// that glared on the night page). A screenshot either comes as a light and a
// dark capture (.theme-light-only / .theme-dark-only), or, when only one
// capture can exist (claude.ai's settings can't be captured in dark without
// signing in; m365crawl's doctor is a terminal, dark in both), it stands in
// the demo windows' frame (.product-media) marked .shot-light-only or
// .shot-dark-only. A screenshot that stands outside a frame never fills the
// screen: .shot-capped holds it to 960px (global.css).

const pageOf = (file) => `/${path.relative(distDir, file).replace(/index\.html$/, '')}`;

test('every product screenshot comes in both themes, or stands framed as the one theme it has', () => {
  let count = 0;
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    if (/http-equiv="refresh"/.test(html)) continue;
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="(\/images\/workshop\/[^"]+)"[^>]*>/g)) {
      if (/portrait|poster/.test(m[1])) continue;
      count++;
      const before = html.slice(Math.max(0, m.index - 400), m.index);
      const opener = before.slice(before.lastIndexOf('<picture') >= before.lastIndexOf('<div') ? before.lastIndexOf('<picture') : before.lastIndexOf('<div'));
      const paired = /theme-(?:light|dark)-only/.test(opener);
      const framed = /class="product-media[^"]*\bshot-(?:light|dark)-only\b/.test(before.slice(before.lastIndexOf('<div')));
      assert.ok(paired || framed, `${pageOf(file)}: ${m[1]} neither has a capture for each theme nor stands framed as a light-only or dark-only shot`);
    }
  }
  assert.ok(count >= 8, `found ${count} screenshots`);
});

test('the Hosted Desk screenshot stands in the demo frame, capped below the screen width, dimmed in dark', () => {
  const html = fs.readFileSync(path.join(distDir, 'desk/index.html'), 'utf8');
  assert.match(html, /<figure class="product-figure shot-capped"[^>]*>\s*<div class="product-media media-shot shot-light-only"[^>]*>\s*<img src="\/images\/workshop\/hosted-desk-connected\.webp"/);
  const css = fs.readdirSync(path.join(distDir, '_astro')).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(distDir, '_astro', f), 'utf8')).join('\n');
  assert.match(css, /\.shot-capped\{max-width:960px\}/);
  assert.match(css, /:root:not\(\[data-theme=light\]\) \.shot-light-only img\{filter:brightness\(\.8\d*\)\}/);
});
