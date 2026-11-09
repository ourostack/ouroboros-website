import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist } from './support/dist.mjs';

// Ari, 2026-11-09: the Ouro MD recording's frame had "this awful double
// border" (a black corner showing through the rounded frame), and the
// recording "was never designed to be so large, so it is quite blurry".
// The recordings are the app's whole window, 840x630 at 1x, with the window's
// own rounded corners baked in: the frame takes that corner, and one pixel
// of the recording is never drawn wider than one pixel of the screen.
const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test("the Ouro MD clip's frame takes the window's own corner, so it has one edge", () => {
  const rule = css.match(/\.product-media\.media-clip \{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /border-radius:\s*4\.1667% \/ 5\.5556%/, 'the frame curves with the recorded window (35/840 by 35/630)');
  assert.match(rule, /aspect-ratio:\s*4 \/ 3/);
});

test('the Ouro MD clip is never drawn larger than its own pixels, on any screen', () => {
  const rule = css.match(/\.product-figure:has\(> \.media-clip\) \{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /max-width:\s*var\(--clip-w\)/);
  // 840 pixels over the screen's pixel ratio: never in rem, which grows past 840px on a wide screen.
  assert.match(css, /:root \{ --clip-w: 840px; \}/);
  for (const [dppx, px] of [['1.25', 672], ['1.5', 560], ['2', 420], ['3', 280]]) {
    assert.ok(Math.abs(px * Number(dppx) - 840) < 1, `${dppx}x: ${px}px`);
    assert.match(css, new RegExp(`@media \\(min-resolution: ${dppx.replace('.', '\\.')}dppx\\) \\{ :root \\{ --clip-w: ${px}px; \\} \\}`), `${dppx}x screens show it at ${px}px`);
  }
  for (const file of ['ouro-md/index.html', 'ouro-md/download/index.html', 'index.html', 'apps/index.html']) {
    const html = readDist(file);
    for (const [, w] of html.matchAll(/<video\b[^>]*data-poster="\/images\/workshop\/ouro-md-[^"]*"[^>]*width="(\d+)"/g)) assert.equal(Number(w), 840, `${file}: a clip claims ${w}px`);
  }
});
