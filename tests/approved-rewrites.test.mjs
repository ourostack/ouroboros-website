import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist, textOf } from './support/dist.mjs';
import { attributeTextsOf, shareCardTextsOf } from './support/surfaces.mjs';
import { pageOg } from '../src/data/og.ts';

// Every row of the root-approved antithesis inventory (2026-10-11): the rewrite
// as proposed, the root's override in its place, or the line kept as written,
// with the copy deck round 2 changes that superseded a few rows. For each row,
// the approved text ("now") is on every surface the row names, and the original
// ("was") is gone from all of them. "…" separates the fragments of a long line.

const rows = JSON.parse(fs.readFileSync(new URL('./fixtures/approved-rewrites.json', import.meta.url), 'utf8'));
const fileFor = (page) => (page === 'index' ? 'index.html' : page === '404' ? '404.html' : `${page}/index.html`);
const shareCards = shareCardTextsOf(pageOg);
// Whitespace and the spaces that tag stripping leaves before punctuation don't count.
const norm = (text) => text.replace(/\s+/g, ' ').replace(/\s+([,.;:?!)])/g, '$1').replace(/\(\s+/g, '(').trim();
const surfaceText = (key) => {
  if (key === 'brief.md' || key === 'llms.txt') return readDist(key);
  if (key.startsWith('share card ')) return (shareCards[key.slice('share card '.length)] ?? []).join('\n');
  if (key.endsWith(' attributes')) return attributeTextsOf(readDist(fileFor(key.slice(0, -' attributes'.length)))).join('\n');
  return textOf(readDist(fileFor(key)).replace(/<nav\b[\s\S]*?<\/nav>/, '').replace(/<footer\b[\s\S]*?<\/footer>/, ''));
};
const cache = new Map();
const current = (key) => {
  if (!cache.has(key)) cache.set(key, norm(surfaceText(key)));
  return cache.get(key);
};
const fragments = (line) => (line ? line.split('…').map((part) => norm(part)).filter((part) => part.length > 2) : []);

test('the approved-rewrites fixture holds every inventory row with a ruling', () => {
  assert.equal(rows.length, 105, 'The inventory has 105 rows');
  for (const row of rows) {
    assert.ok(row.surfaces.length > 0 && row.was && row.ruling, `Row is incomplete: ${row.was}`);
  }
});

test("every approved rewrite's text is present, and its original wording is gone", () => {
  const missing = [];
  const remaining = [];
  for (const row of rows) {
    const now = fragments(row.now);
    // A fragment of the original that the approved text still carries is allowed to stay.
    const was = fragments(row.was).filter((part) => !now.some((kept) => kept.includes(part)));
    for (const surface of row.surfaces) {
      const text = current(surface);
      for (const part of now) if (!text.includes(part)) missing.push(`${surface}: ${part}`);
      for (const part of was) if (text.includes(part)) remaining.push(`${surface}: ${part}`);
    }
  }
  assert.deepEqual(missing, [], 'These approved rewrites are missing');
  assert.deepEqual(remaining, [], 'These original wordings are still published');
});
