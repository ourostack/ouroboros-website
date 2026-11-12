// Every ouroboros.bot address answers over HTTPS on the apex, with HSTS (2026-11-09: plain HTTP
// answered 200, and www.ouroboros.bot sent http to http and failed over https).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, { canonicalFor, hsts, httpsRedirect } from '../src/worker/https.mjs';
import site from '../src/worker/index.ts';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const assets = { fetch: async () => new Response('<p>page</p>', { headers: { 'content-type': 'text/html' } }) };

test('plain HTTP and www go to the same path and query on https://ouroboros.bot', async () => {
  for (const from of [
    'http://ouroboros.bot/',
    'http://ouroboros.bot/ouro-md/download/?ref=a&b=2',
    'http://www.ouroboros.bot/',
    'https://www.ouroboros.bot/blog/x/?q=1',
    'http://www.ouroboros.bot/a%20b?c=%2F',
  ]) {
    const url = new URL(from);
    const response = await worker.fetch(new Request(from));
    assert.equal(response.status, 301, from);
    assert.equal(response.headers.get('location'), `https://ouroboros.bot${url.pathname}${url.search}`, from);
    assert.equal(response.headers.get('strict-transport-security'), hsts, from);
  }
});

test('canonical and foreign hosts are left alone', () => {
  for (const url of ['https://ouroboros.bot/', 'https://ouroboros.bot/x?y=1', 'https://ouroboros-website.example.workers.dev/', 'http://localhost:8787/']) {
    assert.equal(canonicalFor(new URL(url)), null, url);
    assert.equal(httpsRedirect(new Request(url)), null, url);
  }
});

test("the site's Worker sends HSTS, and sends plain HTTP to https before its own redirects", async () => {
  const page = await site.fetch(new Request('https://ouroboros.bot/og/og-home.jpg'), { ASSETS: assets });
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('strict-transport-security'), hsts);

  const moved = await site.fetch(new Request('https://ouroboros.bot/why?x=1'), { ASSETS: assets });
  assert.equal(moved.status, 301);
  assert.equal(new URL(moved.headers.get('location')).href, 'https://ouroboros.bot/lab/why/?x=1');
  assert.equal(moved.headers.get('strict-transport-security'), hsts);

  const insecure = await site.fetch(new Request('http://ouroboros.bot/why?x=1'), { ASSETS: assets });
  assert.equal(insecure.status, 301);
  assert.equal(insecure.headers.get('location'), 'https://ouroboros.bot/why?x=1');
});

test('the HTTPS Worker runs only for plain HTTP and www, and is deployed', () => {
  const config = JSON.parse(read('wrangler-https.jsonc'));
  assert.equal(config.main, 'src/worker/https.mjs');
  assert.equal(config.workers_dev, false);
  // ouroboros.bot/* or https://ouroboros.bot/* here would put every HTTPS visit through this Worker.
  assert.deepEqual(config.routes.map((r) => r.pattern).sort(), ['http://ouroboros.bot/*', 'www.ouroboros.bot/*']);
  assert.ok(config.routes.every((r) => r.zone_name === 'ouroboros.bot'));
  assert.match(read('.github/workflows/deploy.yml'), /command: deploy --config wrangler-https\.jsonc/);
});

test('every static asset carries HSTS through _headers', () => {
  const rules = (text) => text.replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim();
  assert.equal(rules(read('public/_headers')), `/* Strict-Transport-Security: ${hsts}`);
  assert.equal(read('dist/_headers'), read('public/_headers'), 'the build copies public/_headers into dist/');
});
