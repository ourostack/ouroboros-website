import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapCode, wrapToken } from '../src/lib/code-wrap.mjs';
import { listHtmlFiles, readDist } from './support/dist.mjs';
import fs from 'node:fs';

// URLs, paths and inline code break only where a reader expects (taste
// reviews r8 and r9, 2026-11-06). scripts/text-breaks.mjs checks the rendered
// result in a browser at 320, 390 and 430.

test('a short token stays whole', () => {
  assert.equal(wrapCode('<p><code>--primary</code> and <code class="model-code">npm run dev</code></p>'), '<p><code class="code-whole">--primary</code> and <code class="model-code code-whole">npm run dev</code></p>');
});

test('a long token breaks only after a slash or before a dot, never leaving a stub', () => {
  assert.equal(wrapToken('https://github.com/ourostack/ouroboros'), '<span class="tok">https://</span><wbr><span class="tok">github</span><wbr><span class="tok">.com/</span><wbr><span class="tok">ourostack/</span><wbr><span class="tok">ouroboros</span>');
  assert.equal(wrapToken('~/.copilot/lsp-config.json'), '<span class="tok">~/.copilot/</span><wbr><span class="tok">lsp-config</span><wbr><span class="tok">.json</span>');
  assert.equal(wrapToken('https://x.io/ab/s'), '<span class="tok">https://</span><wbr><span class="tok">x.io/</span><wbr><span class="tok">ab/s</span>');
  assert.equal(wrapToken('ouroboros.bot/skills/manifest.json'), '<span class="tok">ouroboros</span><wbr><span class="tok">.bot/</span><wbr><span class="tok">skills/</span><wbr><span class="tok">manifest</span><wbr><span class="tok">.json</span>');
  assert.match(wrapToken('blob/e7637306bc9246a3e42e407cb94f96b7ed345e3e/README.md'), /<span class="tok tok-long">e7637306/);
  assert.match(wrapToken('tree/main/src?ref=e7637306bc9246a3e42e407cb94f96b7ed345e3e'), /main\/src<\/span><wbr><span class="tok tok-long">\?ref=/);
});

test('every URL and path is wrapped: prose, links, mono spans and preformatted text', () => {
  assert.equal(
    wrapCode('<p>See <span class="font-mono">https://github.com/o/desk</span> and macOS/iOS/Android/Windows.</p>'),
    '<p>See <span class="font-mono"><span class="tok">https://</span><wbr><span class="tok">github</span><wbr><span class="tok">.com/</span><wbr><span class="tok">o/desk</span></span> and <span class="tok">macOS/</span><wbr><span class="tok">iOS/</span><wbr><span class="tok">Android/</span><wbr><span class="tok">Windows.</span></p>',
  );
  assert.equal(wrapCode('<pre>curl -fsSL https://ouro.bot/x.sh | bash</pre>'), '<pre>curl <span class="tok">-fsSL</span> <span class="tok">https://</span><wbr><span class="tok">ouro</span><wbr><span class="tok">.bot/</span><wbr><span class="tok">x.sh</span> | bash</pre>');
  assert.equal(wrapCode('<pre>npx init --no-monorepo</pre>'), '<pre>npx init <span class="tok">--no-monorepo</span></pre>');
  // Ordinary words, scripts, styles, attributes and the head stay as they are.
  const untouched = '<head><title>a/b/c/d/e/f/g</title></head><p title="https://x.io/a/b/c">re-explaining</p><script>if (a<b) x("https://x.io/a/b/c")</script>';
  assert.equal(wrapCode(untouched), untouched);
});

test('the built pages carry it, with no break-all anywhere', () => {
  assert.match(readDist('ouro-hx/index.html'), /<code class="code-whole">--primary<\/code>/);
  const review = readDist('lab/model-reviews/anthropic/index.html');
  assert.match(review, /class="fetch-url[^"]*code-long"[^>]*><span class="tok">https:\/\/<\/span><wbr>/);
  assert.match(readDist('blog/trust-the-agent/index.html'), /<span class="tok">https:\/\/<\/span><wbr><span class="tok">github<\/span><wbr><span class="tok">\.com\/<\/span><wbr><span class="tok">ourostack\/<\/span>/);
  assert.match(readDist('lab/docs/index.html'), /<span class="tok">manifest<\/span><wbr><span class="tok">\.json<\/span>/);
  for (const file of listHtmlFiles()) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bbreak-all\b|word-break:\s*break-all/, file);
});
