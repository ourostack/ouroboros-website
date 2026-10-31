import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { entry, labelFor } from '../src/data/readiness.mjs';

const docs = 'https://ui.ouro.bot/docs/';
const voyage = 'https://ui.ouro.bot/voyage/';
const card = () => readDist('index.html').match(/<article\b[^>]*id="ouro-ui"[\s\S]*?<\/article>/)?.[0];
const copy = 'Ouro HX is a React component library that feels right to the people using it and is obvious to the agents building with it. Ouro AX comes next: the same care for interfaces an agent uses, such as CLIs and MCP servers.';

// Ari, 2026-10-19: AX is the half for interfaces an agent uses, after HX; it is not "still being defined".
// Ari, 2026-10-30: HX is used in production (Spoonjoy, ui.ouro.bot), so it is no longer "Under construction".
test('the Ouro UI entry marks HX ready to use, and AX as what comes next', () => {
  const html = card();
  assert.ok(html, 'Ouro UI entry is missing');
  const text = textOf(html).replace(/\s+/g, ' ');
  assert.match(html, /<h3\b[^>]*>[\s\S]*?Ouro UI[\s\S]*?<\/h3>/);
  assert.ok(text.includes(copy));
  assert.ok(text.includes('Ouro HX · Use today'));
  assert.doesNotMatch(text, /under construction/i);
  assert.doesNotMatch(text, /still being defined/);
  assert.match(html, /src="\/brand\/ouro-hx-render\.webp"/);
  assert.doesNotMatch(html, /src="[^"]*\.svg"|href="[^"]*ouro-ax|install|stable|production-ready/i);
  assert.ok(html.includes(`href="${voyage}"`), 'The entry links to the live showcase');
});

test('HX gets its Use today label from shared readiness data', () => {
  assert.equal(entry('ouro-hx').label, 'Use today');
  assert.equal(entry('ouro-hx').detail, 'React component library');
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

test('the agent surface names HX without presenting AX as an available product', () => {
  const text = fs.readFileSync(path.join(distDir, 'llms.txt'), 'utf8');
  assert.ok(text.includes('Ouro UI'));
  assert.ok(text.includes('Ouro HX'));
  assert.doesNotMatch(text, /Ouro HX[^\n]*under construction/i);
  assert.ok(text.includes(voyage));
  assert.ok(text.includes('Ouro AX, the same care for interfaces an agent uses'));
  assert.doesNotMatch(text, /still being defined/);
});
