import assert from 'node:assert/strict';
import test from 'node:test';
import { scanDirs, scanText } from './support/fades.mjs';

// No picture on the site fades into the page or into nothing, at any edge
// (Ari, 2026-11-08). Every gradient mask in src/ and public/ fails unless its
// line, or the line before, says `fade-ok: <reason>`: a tint or a drawn grid
// that fades no picture. Runs in site-checks (npm test), the check that gates
// merges.
test('no gradient mask in src/ or public/ without a fade-ok reason', () => {
  assert.deepEqual(scanDirs(['src', 'public']), [], 'A picture fades: give it a hard edge, or mark an artistic gradient with fade-ok: <reason>');
});

// Tailwind scans this file for class names, so the class strings below are
// built in pieces: written whole, they would compile into the site's CSS.
const tw = (...parts) => parts.join('');

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
  for (const text of planted) assert.equal(scanText(text).length, 1, `missed: ${text}`);
  const allowed = [
    '/* fade-ok: a flat tint, no picture */\n.band { mask-image: linear-gradient(#000, transparent); }',
    '.band { mask-image: linear-gradient(#000, transparent); } /* fade-ok: a drawn grid */',
    '.logo { mask: url(/brand/mark.svg) center / contain no-repeat; }',
    '.logo { mask-size: contain; mask-image: url(/mark.svg); }',
    `<div class="${tw('mask', '-type-alpha')}"></div>`,
    `<div style="mask: url(/a.svg) center" class="${tw('bg-[linear', '-gradient(red,blue)]')}"></div>`,
    '.trail { background: linear-gradient(90deg, transparent, gold, transparent); }',
  ];
  for (const text of allowed) assert.deepEqual(scanText(text), [], `flagged: ${text}`);
  // A reason is required, not just the marker.
  assert.equal(scanText('/* fade-ok: */\n.x { mask-image: linear-gradient(#000, transparent); }').length, 1);
});
