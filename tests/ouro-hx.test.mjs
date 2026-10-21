import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { entry, labelFor } from '../src/data/readiness.mjs';

const docs = 'https://ourostack.github.io/ouro-ui/docs/';
const voyage = 'https://ourostack.github.io/ouro-ui/voyage/';
const card = () => readDist('index.html').match(/<article\b[^>]*id="ouro-ui"[\s\S]*?<\/article>/)?.[0];
const copy = 'Ouro HX is a React component library that feels right to the people using it and is obvious to the agents building with it. Ouro AX comes next: the same care for interfaces an agent uses, such as CLIs and MCP servers.';

// Ari, 2026-10-19: AX is the half for interfaces an agent uses, after HX; it is not "still being defined".
test('the Ouro UI entry names HX under construction, and AX as what comes next', () => {
  const html = card();
  assert.ok(html, 'Ouro UI entry is missing');
  const text = textOf(html).replace(/\s+/g, ' ');
  assert.match(html, /<h3\b[^>]*>[\s\S]*?Ouro UI[\s\S]*?<\/h3>/);
  assert.ok(text.includes(copy));
  assert.ok(text.includes('Under construction'));
  assert.doesNotMatch(text, /still being defined/);
  assert.match(html, /src="\/brand\/ouro-hx-render\.webp"/);
  assert.doesNotMatch(html, /src="[^"]*\.svg"|href="[^"]*ouro-ax|install|stable|production-ready/i);
  assert.ok(html.includes(`href="${voyage}"`), 'The entry links to the live showcase');
});

test('HX gets its explicit construction qualification from shared readiness data', () => {
  assert.equal(entry('ouro-hx').label, 'Under construction');
  assert.deepEqual(labelFor('ouro-hx'), { label: 'Under construction', tone: 'tag-alpha' });
});

// Ari, 2026-10-20: a big logo is not a visual. The entry shows the live Voyage showcase, where
// every control is an HX component, captured in both themes with its provenance.
test('the Ouro UI entry shows the Voyage showcase in both themes, linked to the live stage', () => {
  const html = card();
  assert.ok(html);
  const provenance = JSON.parse(fs.readFileSync(path.join(distDir, 'images/workshop/hx-voyage-provenance.json'), 'utf8'));
  assert.equal(provenance.source, voyage);
  for (const theme of ['light', 'dark']) {
    assert.match(html, new RegExp(`<picture class="theme-${theme}-only"[^>]*><img src="/images/workshop/hx-voyage-${theme}\\.webp" width="1200" height="1069"[^>]*alt="[^"]{40,}"`));
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
  assert.ok(text.includes('under construction'));
  assert.ok(text.includes(voyage));
  assert.ok(text.includes('Ouro AX, the same care for interfaces an agent uses'));
  assert.doesNotMatch(text, /still being defined/);
});
