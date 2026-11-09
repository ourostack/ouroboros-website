import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// The family bar and footer list the public Ouro family in one order on every
// site. src/data/family.json is a byte-for-byte copy of the canonical list in
// ourostack/.github (brand/family.json). When the network is reachable this
// compares the bytes; offline it checks the ids and their order.
const CANONICAL = 'https://raw.githubusercontent.com/ourostack/.github/main/brand/family.json';
const ORDER = ['ouro', 'ouro-ui', 'ouro-md', 'desk', 'apps', 'ari', 'github'];
const local = fs.readFileSync(new URL('../src/data/family.json', import.meta.url));

test('the family list is the canonical one, byte for byte', async (t) => {
  let canonical;
  try {
    const res = await fetch(CANONICAL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    canonical = Buffer.from(await res.arrayBuffer());
  } catch (error) {
    t.skip(`canonical list unreachable (${error.message}); the ids and order are checked below`);
    return;
  }
  assert.ok(local.equals(canonical), 'src/data/family.json differs from ourostack/.github brand/family.json: copy it again, byte for byte');
});

test('the family list names every site in the family order', () => {
  const { links } = JSON.parse(local.toString('utf8'));
  assert.deepEqual(links.map((l) => l.id), ORDER);
  for (const link of links) {
    assert.match(link.href, /^https:\/\//, `${link.id}: an absolute https link`);
    assert.ok(link.label?.trim(), `${link.id}: a label`);
  }
});
