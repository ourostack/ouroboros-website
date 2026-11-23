import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { entry, labelFor } from '../src/data/readiness.mjs';

const docs = 'https://ui.ouroboros.bot/docs/';
const voyage = 'https://ui.ouroboros.bot/voyage/';
const card = () => readDist('index.html').match(/<article\b[^>]*id="ouro-ui"[\s\S]*?<\/article>/)?.[0];
const copy = 'Ouro UI is how a lesson in one of my apps reaches all of them. When I learn a better way to build an interface, or a better way for my agents to test one, it goes into the kit, and every product picks it up in its next pull request: screens for people and doors for agents, on the web, Apple, Windows and Android. A public board checks all of them hourly, and paying or deleting still waits for me.';

// Ari, 2026-10-19: AX is the half for interfaces an agent uses, after HX; it is not "still being defined".
// 2026-11-22: AX is no longer only next. Ouroboros declares its agent doors with Ouro AX cards and its CI census
// refuses an undeclared one (ourostack/ouroboros ax/census.baseline.json, ax-xray.yml), so the card says so.
// Ari, 2026-10-30: HX is used in production (Spoonjoy, ui.ouroboros.bot), so it is no longer "Under construction".
// Ari, 2026-11-23 (launch copy deck v7, 3.4): Ouro UI is the whole kit and the first product on the home page; the card
// says why it exists, in Ari's words, with no readiness tag, and never calls it a React component library.
test('the Ouro UI entry comes first, says why the kit exists, and links to it, the showcase and the source', () => {
  const html = card();
  assert.ok(html, 'Ouro UI entry is missing');
  const text = textOf(html).replace(/\s+/g, ' ');
  // The entry is named for its site, Ouro UI (ui.ouroboros.bot), the home of
  // Ouro HX and Ouro AX, as the family bar names it on every family site
  // (Ari, 2026-11-08: "now ouro ui is one of my biggest things").
  assert.match(html, /<h3\b[^>]*>[\s\S]*?Ouro UI[\s\S]*?<\/h3>/);
  assert.match(html, /<a href="https:\/\/ui\.ouroboros\.bot\/"[^>]*>Meet Ouro UI/);
  assert.ok(text.includes(copy));
  assert.doesNotMatch(html, /class="tag /);
  assert.doesNotMatch(text, /React component library/);
  assert.ok(html.includes('href="https://github.com/ourostack/ouro-ui"'), 'The entry links to the source');
  const first = readDist('index.html').match(/<article class="tool"[^>]*id="([^"]+)"/)?.[1];
  assert.equal(first, 'ouro-ui', 'Ouro UI is the first product on the home page');
  assert.doesNotMatch(text, /under construction/i);
  assert.doesNotMatch(text, /still being defined/);
  assert.doesNotMatch(html, /src="[^"]*\.svg"|href="[^"]*ouro-ax|install|stable|production-ready/i);
  assert.ok(html.includes(`href="${voyage}"`), 'The entry links to the live showcase');
});

test('Ouro UI gets its Use today label and its tag from shared readiness data', () => {
  assert.equal(entry('ouro-hx').label, 'Use today');
  assert.equal(entry('ouro-hx').detail, 'For every interface you build');
  assert.deepEqual(labelFor('ouro-hx'), { label: 'Use today', tone: 'tag-today' });
});

// Ari, 2026-10-20: a big logo is not a visual. The entry shows the live Voyage showcase, where
// every control is an HX component, captured in both themes with its provenance.
test('the Ouro UI entry shows the Voyage showcase in both themes, linked to the live stage', () => {
  const html = card();
  assert.ok(html);
  const provenance = JSON.parse(fs.readFileSync(path.join(distDir, 'images/workshop/hx-voyage-provenance.json'), 'utf8'));
  assert.equal(provenance.source, voyage);
  for (const theme of ['light', 'dark']) {
    assert.match(html, new RegExp(`<picture class="theme-${theme}-only"[^>]*><img src="/images/workshop/hx-voyage-${theme}\\.webp" width="1164" height="1051"[^>]*alt="[^"]{40,}"`));
    const bytes = fs.readFileSync(path.join(distDir, `images/workshop/hx-voyage-${theme}.webp`));
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
  assert.match(html, new RegExp(`<a href="${voyage.replace(/[.\/]/g, '\\$&')}" class="product-media`));
  assert.doesNotMatch(html, /hx-dialog-|class="product-media hx-art"|Aronnax/);
});

test('the agent surface names HX, and says what AX does today', () => {
  const text = fs.readFileSync(path.join(distDir, 'llms.txt'), 'utf8');
  assert.ok(text.includes('Ouro UI'));
  assert.ok(text.includes('Ouro HX'));
  assert.doesNotMatch(text, /Ouro HX[^\n]*under construction/i);
  assert.ok(text.includes(voyage));
  assert.ok(text.includes('Ouro AX, the doors agents use'));
  assert.doesNotMatch(text, /React component library/);
  assert.doesNotMatch(text, /still being defined/);
});
