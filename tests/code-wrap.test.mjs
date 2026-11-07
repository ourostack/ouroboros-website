import assert from 'node:assert/strict';
import test from 'node:test';
import { hostEnd, wrapCode, wrapToken } from '../src/lib/code-wrap.mjs';
import { listHtmlFiles, readDist, textOf } from './support/dist.mjs';
import fs from 'node:fs';
// Every named reference HTML knows (test only; the build does not need it).
import { decodeHTML } from 'entities';

// URLs, paths and inline code break only where a reader expects (taste
// reviews r8 and r9, 2026-11-06). scripts/text-breaks.mjs checks the rendered
// result in a browser at 320, 390 and 430.

test('a short token stays whole', () => {
  assert.equal(wrapCode('<p><code>--primary</code> and <code class="model-code">npm run dev</code></p>'), '<p><code class="code-whole">--primary</code> and <code class="model-code code-whole">npm run dev</code></p>');
});

test('a long token breaks only after a slash, never before a file name\'s extension, never leaving a stub', () => {
  assert.equal(wrapToken('https://github.com/ourostack/ouroboros'), '<span class="tok tok-long tok-url">https://<wbr><span class="tok-host">github.com/</span></span><wbr><span class="tok">ourostack/</span><wbr><span class="tok">ouroboros</span>');
  assert.equal(wrapToken('~/.copilot/lsp-config.json'), '<span class="tok">~/.copilot/</span><wbr><span class="tok">lsp-config.json</span>');
  assert.equal(wrapToken('https://x.io/ab/s'), '<span class="tok">https://x.io/</span><wbr><span class="tok">ab/s</span>');
  assert.equal(wrapToken('ouroboros.bot/skills/manifest.json'), '<span class="tok">ouroboros.bot/</span><wbr><span class="tok">skills/</span><wbr><span class="tok">manifest.json</span>');
  assert.match(wrapToken('blob/e7637306bc9246a3e42e407cb94f96b7ed345e3e/README.md'), /<span class="tok tok-long">e7637306/);
  assert.match(wrapToken('tree/main/src?ref=e7637306bc9246a3e42e407cb94f96b7ed345e3e'), /main\/src<\/span><wbr><span class="tok tok-long">\?ref=/);
});

test('a scheme and domain never break, and a file name is not a domain', () => {
  assert.equal(hostEnd('https://github.com/o/x'), 'https://github.com'.length);
  assert.equal(hostEnd('ouroboros.bot/brief.md'), 'ouroboros.bot'.length);
  assert.equal(hostEnd('(https://ouroboros.bot).'), '(https://ouroboros.bot'.length);
  assert.equal(hostEnd('&quot;https://ui.ouroboros.bot/r/x.json&quot;'), '&quot;https://ui.ouroboros.bot'.length);
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
  // The h1 is held in phrases (.t-ph) since taste review r16; the hyphenated word still never breaks.
  const deskH1 = readDist('lab/how-desk-started/index.html').match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1];
  assert.match(deskH1, /<span class="nobr">to-do<\/span>/);
  assert.match(textOf(deskH1), /^Slugger wrote himself a to-do list\. /);
  assert.match(readDist('lab/docs/index.html'), /<span class="tok">(?:[\w.-]+\/)?manifest\.json<\/span>/);
  for (const file of listHtmlFiles()) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bbreak-all\b|word-break:\s*break-all/, file);
});

test('a long scheme and host offer one break, right after the "//", and keep the host whole', () => {
  // Ari's ruling, taste review r11: "https://hermes-agent.nousresearch.com/" split inside the host at 320.
  assert.equal(
    wrapToken('https://hermes-agent.nousresearch.com/docs/'),
    '<span class="tok tok-long tok-url">https://<wbr><span class="tok-host">hermes-agent.nousresearch.com/</span></span><wbr><span class="tok">docs/</span>',
  );
  // The same URL quoted inside markup (a fetched README's <a href="...">) keeps its host whole too.
  assert.match(wrapToken('href=&quot;https://hermes-agent.nousresearch.com/docs/&quot;&gt;'), /tok-url">href="https:\/\/<wbr><span class="tok-host">hermes-agent\.nousresearch\.com\/<\/span>/);
  // A short one is a single unbreakable piece, as before.
  assert.equal(wrapToken('https://x.io/abcd'), '<span class="tok">https://x.io/</span><wbr><span class="tok">abcd</span>');
});

test('a heading never breaks at a hyphen', () => {
  // Taste review r11: the /lab/how-desk-started/ h1 broke as "to-" / "do" at 320.
  assert.equal(wrapCode("<h1 class=\"heading-lead\">Slugger's to-do list</h1>"), "<h1 class=\"heading-lead\">Slugger's <span class=\"nobr\">to-do</span> list</h1>");
  assert.equal(wrapCode('<h2>A <em>follow-up</em> note</h2><p>a to-do list</p>'), '<h2>A <em><span class="nobr">follow-up</span></em> note</h2><p>a to-do list</p>');
});

test('a character reference is never split, and code shows the characters, not the reference', () => {
  // Taste review r14: the awk command on /blog/trust-the-agent/ and nine spots
  // on /lab/model-reviews/openai/ read "&#123;", "&#125;" and "&#39;".
  // The old splitter cut a token before every "#", inside "&#123;" too.
  for (const token of ["&#39;&#123;print/$1&#125;&#39;/x", 'ouro/x?y=&#123;a&#125;#&#39;b&#39;', '/a/&#x7b;b&#x7d;/c']) {
    const html = wrapToken(token);
    assert.doesNotMatch(html.replace(/<[^>]*>/g, '|'), /&#?\|?[x0-9]*\|/i, html);
    assert.doesNotMatch(html, /&#/, html);
  }
  assert.equal(wrapToken("&#39;&#123;print/$1&#125;&#39;/x"), `<span class="tok">'{print/</span><wbr><span class="tok">$1}'/x</span>`);
  assert.match(wrapToken('https://x.io/a?b=1&amp;c=2#frag'), /&amp;c=2/);
  // A reference the decoder does not know comes back unchanged and whole.
  assert.match(wrapToken('a/b/c&hellip;/d/eeeeee'), /c&hellip;\//);
  assert.equal(wrapToken('&lt;docs/agent-orientation-substrate.md&gt;'), '<span class="tok">&lt;docs/</span><wbr><span class="tok tok-long">agent-orientation-substrate.md&gt;</span>');
});

test('a file name never breaks before its extension', () => {
  // Ari's ruling, taste review r14: the last path segment stays whole.
  for (const [token, last] of [
    ['https://ouroboros.bot/brief.md', 'brief.md'],
    ['~/.ouro/agents/slugger/state/latest-ready.json', 'latest-ready.json'],
    ['src/heart/personality.yaml', 'personality.yaml'],
    ['src/__tests__/parser.test.ts', 'parser.test.ts'],
  ]) {
    const pieces = [...wrapToken(token).matchAll(/<span class="tok[^"]*">([^<]*)/g)].map((m) => m[1]);
    assert.ok(pieces.at(-1).endsWith(last), `${token}: ${pieces.join(' | ')}`);
  }
});


test('no built page shows a character reference as text', () => {
  // Any text a reader sees that still reads "&#123;" or "&amp;" means a
  // reference was escaped twice or split by markup.
  const bad = [];
  for (const file of listHtmlFiles()) {
    const body = fs.readFileSync(file, 'utf8').replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '');
    // Rendered text: decode each text node once, then join them, so a
    // reference split by markup ("&" | "#123;") shows up joined.
    const decode = (t) => decodeHTML(t);
    const text = body.split(/<[^>]*>/).map(decode).join('');
    for (const m of text.matchAll(/&#\d+;|&#x[0-9a-f]+;|&[a-z][a-z0-9]*;/gi)) bad.push(`${file.replace(/.*dist\//, '')}: ${text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')}`);
  }
  assert.deepEqual(bad, []);
});
