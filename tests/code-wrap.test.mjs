import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { wrapCode, wrapToken } from '../src/lib/code-wrap.mjs';
import { readDist } from './support/dist.mjs';

// Inline code breaks only where a reader expects (taste review r8, 2026-11-06).

test('a short token stays whole', () => {
  assert.equal(wrapCode('<p><code>--primary</code> and <code class="model-code">npm run dev</code></p>'), '<p><code class="code-whole">--primary</code> and <code class="model-code code-whole">npm run dev</code></p>');
});

test('a long token breaks only after a slash or at a space, never leaving a stub', () => {
  assert.equal(wrapToken('https://github.com/ourostack/ouroboros'), '<span class="tok">https://</span><wbr><span class="tok">github.com/</span><wbr><span class="tok">ourostack/</span><wbr><span class="tok">ouroboros</span>');
  assert.equal(wrapToken('~/.copilot/lsp-config.json'), '<span class="tok">~/.copilot/</span><wbr><span class="tok">lsp-config.json</span>');
  assert.equal(wrapToken('https://x.io/ab/s'), '<span class="tok">https://</span><wbr><span class="tok">x.io/</span><wbr><span class="tok">ab/s</span>');
  assert.match(wrapToken('blob/e7637306bc9246a3e42e407cb94f96b7ed345e3e/README.md'), /<span class="tok tok-long">e7637306/);
});

test('preformatted code is left alone', () => {
  const pre = '<pre><code>npm run dev</code></pre>';
  assert.equal(wrapCode(pre), pre);
});

test('the built pages carry it: ouro-hx tokens and transcript URLs', () => {
  assert.match(readDist('ouro-hx/index.html'), /<code class="code-whole">--primary<\/code>/);
  const review = readDist('lab/model-reviews/anthropic/index.html');
  assert.match(review, /class="fetch-url[^"]*code-long"[^>]*><span class="tok">https:\/\/<\/span><wbr>/);
  assert.doesNotMatch(review, /fetch-url[^"]*\[overflow-wrap:anywhere\]/);
});
