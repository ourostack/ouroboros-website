import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist, textOf } from './support/dist.mjs';

// Every published sentence stays, except the changes the copy deck and the root's
// rulings allow (2026-10-11).
//
// published-sentences.json is the visible text of every page at 122ab3f (the
// homepage commit, before the site-wide edit pass), split into sentences, with
// the nav and footer left out. published-sentence-changes.json lists each
// sentence that is allowed to go, why, and the sentence that replaced it (null
// when the deck or a ruling removed it outright).

const snapshot = JSON.parse(fs.readFileSync(new URL('./fixtures/published-sentences.json', import.meta.url), 'utf8'));
const changes = JSON.parse(fs.readFileSync(new URL('./fixtures/published-sentence-changes.json', import.meta.url), 'utf8'));

const fileFor = (page) => (page === 'index' ? 'index.html' : page === '404' ? '404.html' : `${page}/index.html`);
const pageText = (page) => textOf(readDist(fileFor(page)).replace(/<nav\b[\s\S]*?<\/nav>/, '').replace(/<footer\b[\s\S]*?<\/footer>/, ''));
const key = (page, sentence) => `${page}\u0000${sentence}`;
const allowed = new Map(changes.map((change) => [key(change.page, change.was), change]));

test('every published sentence is still on its page, unless a listed change replaced it', () => {
  const lost = [];
  for (const [page, sentences] of Object.entries(snapshot)) {
    const text = pageText(page);
    for (const sentence of sentences) {
      if (!text.includes(sentence) && !allowed.has(key(page, sentence))) lost.push(`${page}: ${sentence}`);
    }
  }
  assert.deepEqual(lost, [], 'Published sentences went missing without a listed change');
});

test('each listed change happened exactly as listed', () => {
  const stale = [];
  const missingReplacement = [];
  for (const change of changes) {
    assert.ok(change.why, `${change.page}: "${change.was}" needs a reason`);
    assert.ok(snapshot[change.page]?.includes(change.was), `${change.page}: "${change.was}" is not a published sentence`);
    const text = pageText(change.page);
    if (text.includes(change.was)) stale.push(`${change.page}: ${change.was}`);
    if (change.now !== null && !text.includes(change.now)) missingReplacement.push(`${change.page}: ${change.now}`);
  }
  assert.deepEqual(stale, [], 'These listed changes did not happen, so the allowance must go');
  assert.deepEqual(missingReplacement, [], 'These replacements are missing');
});
