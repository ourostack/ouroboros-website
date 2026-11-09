import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// Round two (2026-11-09), the refinement pass: two promises the critics asked
// to see held, not just stated in a comment.
const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

test('from 2000px the nav and the family bar grow with the content column, so titles start under the wordmark', () => {
  const wide = css.match(/@media \(min-width: 2000px\) \{ :root \{([^}]*)\} \}/)?.[1] ?? '';
  const six = Number(wide.match(/--container-6xl:\s*([\d.]+)rem/)?.[1]);
  const seven = Number(wide.match(/--container-7xl:\s*([\d.]+)rem/)?.[1]);
  // The nav is max-w-7xl with lg:px-16 (4rem a side); its inner width is the content's.
  assert.equal(seven - 8, six, `--container-7xl (${seven}rem) less the nav's 8rem of padding is the content column (${six}rem)`);
  assert.doesNotMatch(layout, /100%_-_80rem/, "The family bar's indent follows --container-7xl, not a fixed 80rem");
  assert.match(layout, /\(100%_-_var\(--container-7xl\)\)/);
});

test('every page with a meadow ends the same distance above it', () => {
  assert.match(css, /\.story-meadow \{ margin-top: clamp\(4rem, 7vw, 6\.5rem\);/);
  assert.match(css, /main:has\(\+ \.story-meadow\) > :last-child:not\(\[class~="bg-deep\/40"\]\) \{ padding-bottom: 0; \}/);
});
