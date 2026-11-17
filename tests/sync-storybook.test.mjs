import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

// scripts/sync-storybook.mjs --from-github is what sync-brand.yml runs when
// ourostack/.github's brand art changes. Here a local server stands in for
// raw.githubusercontent.com and serves this site's own copy as "brand/".

const run = promisify(execFile);
const root = new URL('..', import.meta.url).pathname;
const copy = path.join(root, 'public/brand/storybook');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const COMMIT = 'a'.repeat(40);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const tree = (dir) => Object.fromEntries(walk(dir).map((f) => [path.relative(dir, f), sha(fs.readFileSync(f))]));

async function sync(overrides = {}) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url).replace(`/${COMMIT}/brand/`, '');
    const body = overrides[rel] ?? (fs.existsSync(path.join(copy, rel)) ? fs.readFileSync(path.join(copy, rel)) : null);
    res.writeHead(body ? 200 : 404).end(body ?? '');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-out-'));
  try {
    const { stdout } = await run('node', ['scripts/sync-storybook.mjs', '--from-github', COMMIT, '--out', out], {
      cwd: root,
      env: { ...process.env, BRAND_RAW_BASE: `http://127.0.0.1:${server.address().port}` },
    });
    return { out, stdout };
  } finally {
    server.close();
  }
}

test('syncing a brand folder identical to this site\'s copy changes nothing', async () => {
  const { out, stdout } = await sync();
  assert.deepEqual(tree(out), tree(copy));
  assert.match(stdout, new RegExp(`from ourostack/.github@${COMMIT}`));
});

test('a re-drawn file and its new provenance entry are copied over, and the served provenance follows', async () => {
  const entries = JSON.parse(fs.readFileSync(path.join(copy, 'provenance.json'), 'utf8'));
  const target = entries.find((e) => e.file === 'headers/airship.webp');
  const redrawn = Buffer.concat([fs.readFileSync(path.join(copy, target.file)), Buffer.from('x')]);
  const next = entries.map((e) => (e === target ? { ...e, sha256: sha(redrawn) } : e));
  const { out } = await sync({ 'headers/airship.webp': redrawn, 'provenance.json': Buffer.from(JSON.stringify(next)) });
  assert.equal(sha(fs.readFileSync(path.join(out, 'headers/airship.webp'))), sha(redrawn));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'provenance.json'), 'utf8')).find((e) => e.file === target.file).sha256, sha(redrawn));
});

test('a file whose bytes differ from provenance.json fails the sync instead of shipping', async () => {
  await assert.rejects(sync({ 'headers/airship.webp': Buffer.from('not the art') }), /does not match provenance/);
});
