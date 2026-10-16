import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import { readDist, textOf, distDir } from './support/dist.mjs';
import { entry, labelFor } from '../src/data/readiness.mjs';

const docs = 'https://ourostack.github.io/ouro-ui/docs/';
const card = () => readDist('index.html').match(/<article\b[^>]*id="ouro-ui"[\s\S]*?<\/article>/)?.[0];
const copy = "Ouro UI is the home for my interface work. Ouro HX is the component library I'm building for the humans using an interface and the agents building it.";

test('the new card distinguishes the Ouro UI parent, HX under construction and undefined AX', () => {
  const html = card();
  assert.ok(html, 'Ouro UI card is missing');
  const text = textOf(html).replace(/\s+/g, ' ');
  assert.match(html, /<h3\b[^>]*>Ouro UI<\/h3>/);
  assert.match(html, /<h4\b[^>]*>Ouro HX<\/h4>/);
  assert.ok(text.includes(copy));
  assert.ok(text.includes('Ouro AX is still being defined.'));
  assert.ok(text.includes('Under construction'));
  assert.match(html, /src="\/brand\/ouro-hx-render\.webp"/);
  assert.doesNotMatch(html, /src="[^"]*\.svg"|href="[^"]*ouro-ax|install|stable|production-ready/i);
  assert.ok(html.includes(`href="${docs}"`));
});

test('HX gets its explicit construction qualification from shared readiness data', () => {
  assert.equal(entry('ouro-hx').label, 'Under construction');
  assert.deepEqual(labelFor('ouro-hx'), { label: 'Under construction', tone: 'tag-alpha' });
});

test('component media is local, source-derived and pinned to its capture provenance', () => {
  const html = card();
  assert.ok(html);
  const provenance = JSON.parse(fs.readFileSync(path.join(distDir, 'images/workshop/hx-media-provenance.json'), 'utf8'));
  assert.equal(provenance.sourceUrl, 'https://ourostack.github.io/ouro-ui/docs/dialog/');
  assert.ok(provenance.interactionChecks.includes('visible keyboard focus'));
  assert.ok(provenance.interactionChecks.includes('Escape dismisses'));
  const webps = provenance.assets.filter(asset => asset.file.endsWith('.webp'));
  assert.equal(webps.length, 4);
  for (const asset of webps) {
    const bytes = fs.readFileSync(path.join(distDir, 'images/workshop', asset.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8L');
    const dimensions = bytes.readUInt32LE(21);
    assert.deepEqual([1 + (dimensions & 0x3fff), 1 + ((dimensions >>> 14) & 0x3fff)], [asset.width, asset.height]);
    assert.ok(html.includes(asset.file));
  }
  assert.match(html, /<source\b[^>]*media="\(max-width: 639px\)"/);
  assert.match(html, /theme-light-only/);
  assert.match(html, /theme-dark-only/);
  assert.doesNotMatch(html, /<video|<iframe|data-clip|data-playback/);
  const snippet = html.match(/<pre\b[^>]*data-hx-usage[^>]*>([\s\S]*?)<\/pre>/);
  assert.ok(snippet, 'Missing genuine docs usage example');
  assert.equal(textOf(snippet[1]).replace(/\s+/g, ' ').trim(), provenance.usageExample.replace(/\s+/g, ' ').trim());
});

test('the agent surface names HX without presenting AX as an available product', () => {
  const text = fs.readFileSync(path.join(distDir, 'llms.txt'), 'utf8');
  assert.ok(text.includes('Ouro UI'));
  assert.ok(text.includes('Ouro HX'));
  assert.ok(text.includes('under construction'));
  assert.ok(text.includes(docs));
  assert.ok(text.includes('Ouro AX is still being defined'));
});
