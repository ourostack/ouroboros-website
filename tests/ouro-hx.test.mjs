import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { entry, labelFor } from '../src/data/readiness.mjs';

const docs = 'https://ourostack.github.io/ouro-ui/docs/';
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
  assert.ok(html.includes(`href="${docs}"`));
});

test('HX gets its explicit construction qualification from shared readiness data', () => {
  assert.equal(entry('ouro-hx').label, 'Under construction');
  assert.deepEqual(labelFor('ouro-hx'), { label: 'Under construction', tone: 'tag-alpha' });
});

// Ari, 2026-10-19: the Dialog captures were boring, irrelevant and soft, so the entry shows the approved HX art.
test('the Ouro UI entry shows the approved HX art, not the retired Dialog captures', () => {
  const html = card();
  assert.ok(html);
  assert.match(html, /class="product-media hx-art"[^>]*><img src="\/brand\/ouro-hx-render\.webp" width="1024" height="1024" alt="[^"]{20,}"/);
  assert.doesNotMatch(html, /hx-dialog-|data-hx-usage|<video|<iframe/);
});

test('the agent surface names HX without presenting AX as an available product', () => {
  const text = fs.readFileSync(path.join(distDir, 'llms.txt'), 'utf8');
  assert.ok(text.includes('Ouro UI'));
  assert.ok(text.includes('Ouro HX'));
  assert.ok(text.includes('under construction'));
  assert.ok(text.includes(docs));
  assert.ok(text.includes('Ouro AX is still being defined'));
});
