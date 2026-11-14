// site-checks splits the page checks across runners by measured time
// (scripts/check-shards.mjs). These hold the split honest: every check runs in
// exactly one shard, no shard quietly becomes the critical path, and the
// workflow's matrices run every shard they name.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CHECKS, SECONDS, parseShard, shard } from '../scripts/check-shards.mjs';

const workflow = readFileSync(new URL('../.github/workflows/site-checks.yml', import.meta.url), 'utf8');

test('every page check has a recorded time, and every recorded time a check', () => {
  assert.deepEqual(CHECKS.filter((n) => !(SECONDS[n] > 0)), [], 'add these to SECONDS in scripts/check-shards.mjs');
  assert.deepEqual(Object.keys(SECONDS).filter((n) => !CHECKS.includes(n)), [], 'these in SECONDS are not in CHECKS');
});

test('each check runs in exactly one shard, whatever the shard count', () => {
  for (let n = 1; n <= 8; n++) {
    const all = shard(CHECKS, n).flatMap((s) => s.checks);
    assert.equal(all.length, CHECKS.length, `${n} shards`);
    assert.deepEqual([...all].sort(), [...CHECKS].sort(), `${n} shards`);
  }
});

test('no shard runs past its share of the measured time', () => {
  const total = CHECKS.reduce((sum, n) => sum + SECONDS[n], 0);
  const longest = Math.max(...CHECKS.map((n) => SECONDS[n]));
  for (let n = 1; n <= 8; n++) {
    const limit = Math.max(Math.ceil((total / n) * 1.15), longest);
    for (const [i, s] of shard(CHECKS, n).entries()) {
      assert.ok(s.seconds <= limit, `shard ${i + 1}/${n} has ${s.seconds}s of checks (${s.checks.join(', ')}), over its ${limit}s share`);
    }
  }
});

test('the split is the same every time', () => {
  assert.deepEqual(shard(CHECKS, 4), shard(CHECKS, 4));
  assert.deepEqual(shard([...CHECKS].reverse(), 4).map((s) => s.seconds), shard(CHECKS, 4).map((s) => s.seconds));
});

test('--shard takes k/n and nothing else', () => {
  assert.deepEqual(parseShard('2/4'), { index: 1, count: 4 });
  for (const bad of ['0/4', '5/4', '4', '1/0', 'a/b', undefined]) assert.throws(() => parseShard(bad), /--shard/);
});

// A matrix that lists fewer shards than its --shard count would drop checks.
for (const [job, flag] of [['pages', 'check:all -- --shard'], ['ouro-check', 'check.ts dist']]) {
  test(`site-checks runs every ${job} shard`, () => {
    const body = workflow.split(/\n  (?=[a-z-]+:\n)/).find((b) => b.startsWith(`${job}:`));
    assert.ok(body, `no ${job} job in site-checks.yml`);
    const listed = /shard: \[([\d, ]+)\]/.exec(body)?.[1].split(',').map(Number);
    const count = Number(/SHARDS: (\d+)/.exec(body)?.[1]);
    assert.ok(listed && count, `${job} needs a shard matrix and a SHARDS count`);
    assert.deepEqual(listed, Array.from({ length: count }, (_, i) => i + 1));
    assert.match(body, new RegExp(`${flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\$\\{\\{ matrix\\.shard \\}\\}/\\$SHARDS`));
  });
}
