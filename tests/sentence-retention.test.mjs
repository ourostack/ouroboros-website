import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { attributeTextsOf, shareCardTextsOf, sentencesOf, readBrief } from './support/surfaces.mjs';
import { pageOg } from '../src/data/og.ts';

// Every published sentence stays, except the changes the copy decks and the root's
// rulings allow (2026-10-11).
//
// published-sentences.json is the visible text of every page at 122ab3f (the
// homepage commit, before the site-wide edit pass), split into sentences, with
// the nav and footer left out. published-attributes.json is, at the same commit,
// each page's attribute text ("<page> attributes": the title, the meta, og and
// twitter descriptions, and every alt and aria-label), each share card in
// src/data/og.ts ("share card <route>"), and brief.md split into sentences.
// published-sentence-changes.json lists each one that is allowed to go, why, and
// the text that replaced it (null when the deck or a ruling removed it outright).

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const snapshot = { ...fixture('published-sentences.json'), ...fixture('published-attributes.json') };
const changes = fixture('published-sentence-changes.json');

const fileFor = (page) => (page === 'index' ? 'index.html' : page === '404' ? '404.html' : `${page}/index.html`);
const shareCards = shareCardTextsOf(pageOg);
// The current text of one surface, in the same shape as its snapshot.
const surfaceText = (key) => {
  if (key === 'brief.md') return sentencesOf(readBrief(distDir)).join(' ');
  if (key.startsWith('share card ')) return (shareCards[key.slice('share card '.length)] ?? []).join('\n');
  if (key.endsWith(' attributes')) return attributeTextsOf(readDist(fileFor(key.slice(0, -' attributes'.length)))).join('\n');
  return textOf(readDist(fileFor(key)).replace(/<nav\b[\s\S]*?<\/nav>/, '').replace(/<footer\b[\s\S]*?<\/footer>/, ''));
};
const cache = new Map();
const current = (key) => {
  if (!cache.has(key)) cache.set(key, surfaceText(key));
  return cache.get(key);
};
const key = (page, sentence) => `${page}\u0000${sentence}`;
const allowed = new Map(changes.map((change) => [key(change.page, change.was), change]));

test('the snapshot covers visible text, attribute text, share cards, and brief.md', () => {
  const keys = Object.keys(snapshot);
  assert.ok(keys.includes('brief.md'));
  assert.ok(keys.includes('index attributes') && keys.includes('desk attributes'));
  assert.ok(keys.includes('share card /') && keys.includes('share card /desk'));
  // Pages added after the snapshot have no published card to keep.
  const newSinceSnapshot = ['/brief', '/butler', '/lab/how-desk-started'];
  for (const route of Object.keys(pageOg)) assert.ok(keys.includes(`share card ${route}`) || newSinceSnapshot.includes(route), `No snapshot for share card ${route}`);
});

test('every published sentence is still on its page, unless a listed change replaced it', () => {
  const lost = [];
  for (const [page, sentences] of Object.entries(snapshot)) {
    const text = current(page);
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
    const text = current(change.page);
    if (text.includes(change.was)) stale.push(`${change.page}: ${change.was}`);
    if (change.now !== null && !text.includes(change.now)) missingReplacement.push(`${change.page}: ${change.now}`);
  }
  assert.deepEqual(stale, [], 'These listed changes did not happen, so the allowance must go');
  assert.deepEqual(missingReplacement, [], 'These replacements are missing');
});
