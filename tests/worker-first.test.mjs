// Cloudflare answers a browser's page navigation from the static assets before
// the Worker runs, so with not_found_handling "404-page" an old URL served the
// 404 page to people while curl (no Sec-Fetch-Mode: navigate) saw the 301
// (2026-11-08: ouroboros.bot/ouro-hx/ and every older redirect). The paths in
// assets.run_worker_first reach the Worker first, so each redirect must be
// listed there, and no built page should be (it would only add a Worker call).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { redirectFor } from '../src/worker/redirects.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../wrangler-worker.jsonc', import.meta.url), 'utf8'));
const globs = config.assets.run_worker_first;
const toRegex = (glob) => new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
const workerFirst = (p) => globs.some((g) => toRegex(g).test(p));

const redirecting = [
  '/docs', '/docs/', '/docs/getting-started/', '/docs/skills/manifest.json',
  '/model-reviews/', '/model-reviews/anthropic/', '/story', '/story/', '/why', '/why/',
  '/what-is-an-agent-harness/', '/essays', '/essays/', '/essays/trust-the-agent',
  '/lab/what-is-agent-experience', '/lab/what-is-agent-experience/', '/lab/give-your-agent-a-home/',
  '/lab/build-ai-agent-from-scratch/', '/og/og-why.png', '/og/og-docs-architecture.png', '/og/og-home.png',
  '/og/og-ouro-hx.jpg', '/og/og-ouro-hx.png', '/sitemap.xml', '/ouro-hx', '/ouro-hx/', '/ouro-hx/index.html',
];

test('every redirect reaches the Worker before the assets answer a browser', () => {
  assert.ok(Array.isArray(globs) && globs.length, 'wrangler-worker.jsonc has no assets.run_worker_first list');
  for (const p of redirecting) {
    assert.notEqual(redirectFor(p), null, `${p} no longer redirects: update this list`);
    assert.ok(workerFirst(p), `${p} redirects but is not in assets.run_worker_first, so a browser gets the 404 page`);
  }
});

test('no built page runs the Worker first', () => {
  const dist = new URL('../dist/', import.meta.url).pathname;
  const pages = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); e.isDirectory() ? walk(f) : pages.push('/' + path.relative(dist, f)); } };
  walk(dist);
  const hit = pages.filter((p) => workerFirst(p) || (p.endsWith('/index.html') && workerFirst(p.slice(0, -'index.html'.length))));
  assert.deepEqual(hit, [], 'built files matched by run_worker_first');
});
