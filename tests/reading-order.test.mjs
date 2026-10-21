import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist } from './support/dist.mjs';

// Ari, 2026-10-20: every page reads top to bottom. A heading sits directly above its
// body at every width, never in a column beside it, and sections are not boxed cards.
// The one side-by-side layout is copy beside its own media, opted into with .split-media.
const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('.split makes columns only when a section opts in with .split-media', () => {
  const rules = css.match(/[^{}]*\{[^{}]*grid-template-columns:\s*var\(--split-cols[^)]*\)[^{}]*\}/g) ?? [];
  assert.ok(rules.length > 0, 'The .split-media rule is still there');
  for (const rule of rules) assert.match(rule.split('{')[0], /\.split-media/, `A split column rule without .split-media: ${rule.trim()}`);
  assert.doesNotMatch(css, /\.split-sticky|\.split-wide/, 'Sticky and wide splits are gone');
});

test('Desk, Blog, Lab and the docs index list their parts without boxed cards', () => {
  // A padded, bordered, filled box. Copyable prompts (PromptCard) are code, not sections, and carry no padding of their own.
  const card = /class="(?=[^"]*\brounded-2xl\b)(?=[^"]*\bborder\b)(?=[^"]*\bbg-(deep|undergrowth))(?=[^"]*\bp-\d)[^"]*"/;
  for (const page of ['desk/index.html', 'blog/index.html', 'lab/index.html', 'lab/docs/index.html']) {
    assert.doesNotMatch(readDist(page), card, `${page} has a boxed card`);
  }
});

test('the Why Ouroboros questions read in order, not as a staircase', () => {
  const html = readDist('lab/why/index.html');
  assert.doesNotMatch(html, /friction-stair|sm:ml-\[\d+%\]/);
});
