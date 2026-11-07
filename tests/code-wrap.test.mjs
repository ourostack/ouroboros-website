import assert from 'node:assert/strict';
import test from 'node:test';
import { hostEnd, wrapCode, wrapToken } from '../src/lib/code-wrap.mjs';
import { listHtmlFiles, readDist } from './support/dist.mjs';
import fs from 'node:fs';

// URLs, paths and inline code break only where a reader expects (taste
// reviews r8 and r9, 2026-11-06). scripts/text-breaks.mjs checks the rendered
// result in a browser at 320, 390 and 430.

test('a short token stays whole', () => {
  assert.equal(wrapCode('<p><code>--primary</code> and <code class="model-code">npm run dev</code></p>'), '<p><code class="code-whole">--primary</code> and <code class="model-code code-whole">npm run dev</code></p>');
});

test('a long token breaks only after a slash or before a file name\'s dot, never leaving a stub', () => {
  assert.equal(wrapToken('https://github.com/ourostack/ouroboros'), '<span class="tok tok-long tok-url">https://<wbr><span class="tok-host">github.com/</span></span><wbr><span class="tok">ourostack/</span><wbr><span class="tok">ouroboros</span>');
  assert.equal(wrapToken('~/.copilot/lsp-config.json'), '<span class="tok">~/.copilot/</span><wbr><span class="tok">lsp-config</span><wbr><span class="tok">.json</span>');
  assert.equal(wrapToken('https://x.io/ab/s'), '<span class="tok">https://x.io/</span><wbr><span class="tok">ab/s</span>');
  assert.equal(wrapToken('ouroboros.bot/skills/manifest.json'), '<span class="tok">ouroboros.bot/</span><wbr><span class="tok">skills/</span><wbr><span class="tok">manifest</span><wbr><span class="tok">.json</span>');
  assert.match(wrapToken('blob/e7637306bc9246a3e42e407cb94f96b7ed345e3e/README.md'), /<span class="tok tok-long">e7637306/);
  assert.match(wrapToken('tree/main/src?ref=e7637306bc9246a3e42e407cb94f96b7ed345e3e'), /main\/src<\/span><wbr><span class="tok tok-long">\?ref=/);
});

test('a scheme and domain never break, and a file name is not a domain', () => {
  assert.equal(hostEnd('https://github.com/o/x'), 'https://github.com'.length);
  assert.equal(hostEnd('ouroboros.bot/brief.md'), 'ouroboros.bot'.length);
  assert.equal(hostEnd('(https://ouroboros.bot).'), '(https://ouroboros.bot'.length);
  assert.equal(hostEnd('&quot;https://ui.ouro.bot/r/x.json&quot;'), '&quot;https://ui.ouro.bot'.length);
  assert.equal(hostEnd('manifest.json'), 0);
  assert.equal(hostEnd('docs/agent-orientation-substrate.md'), 0);
  assert.equal(hostEnd('~/.copilot/lsp-config.json'), 0);
  assert.equal(wrapToken('github.com/ourostack/desk/blob/main/SETUP.md'), '<span class="tok">github.com/</span><wbr><span class="tok">ourostack/</span><wbr><span class="tok">desk/</span><wbr><span class="tok">blob/</span><wbr><span class="tok">main/</span><wbr><span class="tok">SETUP.md</span>');
  for (const url of ['https://github.com/ourostack/ouroboros-agent-harness/blob/main/docs/x.md', 'ouroboros.bot/lab/docs/getting-started/', 'https://www.ouroboros.bot/brief.md']) {
    const first = wrapToken(url).match(/^<span class="[^"]+">(.+?)<\/span>(?:<\/span>)?(?:<wbr>|$)/)[1].replace(/<[^>]+>/g, '');
    assert.ok(first.endsWith('/') && first.length >= hostEnd(url), `${url} starts with ${first}`);
  }
});

test('every URL and path is wrapped: prose, links, mono spans and preformatted text', () => {
  assert.equal(
    wrapCode('<p>See <span class="font-mono">https://github.com/o/desk</span> and macOS/iOS/Android/Windows.</p>'),
    '<p>See <span class="font-mono"><span class="tok tok-long tok-url">https://<wbr><span class="tok-host">github.com/</span></span><wbr><span class="tok">o/desk</span></span> and <span class="tok">macOS/</span><wbr><span class="tok">iOS/</span><wbr><span class="tok">Android/</span><wbr><span class="tok">Windows.</span></p>',
  );
  assert.equal(wrapCode('<pre>curl -fsSL https://ouro.bot/x.sh | bash</pre>'), '<pre>curl <span class="tok">-fsSL</span> <span class="tok tok-long tok-url">https://<wbr><span class="tok-host">ouro.bot/</span></span><wbr><span class="tok">x.sh</span> | bash</pre>');
  assert.equal(wrapCode('<pre>npx init --no-monorepo</pre>'), '<pre>npx init <span class="tok">--no-monorepo</span></pre>');
  // Ordinary words, scripts, styles, attributes and the head stay as they are.
  const untouched = '<head><title>a/b/c/d/e/f/g</title></head><p title="https://x.io/a/b/c">re-explaining</p><script>if (a<b) x("https://x.io/a/b/c")</script>';
  assert.equal(wrapCode(untouched), untouched);
});

test('the built pages carry it, with no break-all anywhere', () => {
  assert.match(readDist('ouro-hx/index.html'), /<code class="code-whole">--primary<\/code>/);
  const review = readDist('lab/model-reviews/anthropic/index.html');
  assert.match(review, /class="fetch-url[^"]*code-long"[^>]*><span class="tok[^"]*">https:\/\/(?:<wbr><span class="tok-host">)?[a-z0-9.-]+\/(?:<\/span>)?<\/span><wbr>/);
  assert.match(review, /<span class="tok tok-long tok-url">https:\/\/<wbr><span class="tok-host">hermes-agent\.nousresearch\.com\/<\/span><\/span>/);
  assert.match(readDist('blog/trust-the-agent/index.html'), /<span class="tok tok-long tok-url">https:\/\/<wbr><span class="tok-host">github\.com\/<\/span><\/span><wbr><span class="tok">ourostack\/<\/span>/);
  assert.match(readDist('lab/how-desk-started/index.html'), /<h1[^>]*>\s*Slugger wrote himself a <span class="nobr">to-do<\/span> list\./);
  assert.match(readDist('lab/docs/index.html'), /<span class="tok">manifest<\/span><wbr><span class="tok">\.json<\/span>/);
  for (const file of listHtmlFiles()) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bbreak-all\b|word-break:\s*break-all/, file);
});

test('a long scheme and host offer one break, right after the "//", and keep the host whole', () => {
  // Ari's ruling, taste review r11: "https://hermes-agent.nousresearch.com/" split inside the host at 320.
  assert.equal(
    wrapToken('https://hermes-agent.nousresearch.com/docs/'),
    '<span class="tok tok-long tok-url">https://<wbr><span class="tok-host">hermes-agent.nousresearch.com/</span></span><wbr><span class="tok">docs/</span>',
  );
  // The same URL quoted inside markup (a fetched README's <a href="...">) keeps its host whole too.
  assert.match(wrapToken('href=&quot;https://hermes-agent.nousresearch.com/docs/&quot;&gt;'), /tok-url">href=&quot;https:\/\/<wbr><span class="tok-host">hermes-agent\.nousresearch\.com\/<\/span>/);
  // A short one is a single unbreakable piece, as before.
  assert.equal(wrapToken('https://x.io/abcd'), '<span class="tok">https://x.io/</span><wbr><span class="tok">abcd</span>');
});

test('a heading never breaks at a hyphen', () => {
  // Taste review r11: the /lab/how-desk-started/ h1 broke as "to-" / "do" at 320.
  assert.equal(wrapCode("<h1 class=\"heading-lead\">Slugger's to-do list</h1>"), "<h1 class=\"heading-lead\">Slugger's <span class=\"nobr\">to-do</span> list</h1>");
  assert.equal(wrapCode('<h2>A <em>follow-up</em> note</h2><p>a to-do list</p>'), '<h2>A <em><span class="nobr">follow-up</span></em> note</h2><p>a to-do list</p>');
});
