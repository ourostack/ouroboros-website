import assert from 'node:assert/strict';
import test from 'node:test';
import { glueArrows } from '../src/lib/glue-arrows.mjs';
import { listHtmlFiles } from './support/dist.mjs';
import fs from 'node:fs';

// An arrow is always glued to the word before it (Ari's ruling on taste
// review r17, 2026-11-07: the docs exit links' "→" fell onto a line of its
// own at 390). scripts/line-ends.mjs checks the rendered pages at 320, 390
// and 430.

test('the space before an arrow becomes a no-break space, in the same text or across inline tags', () => {
  assert.equal(glueArrows('<a>The full story &rarr;</a>'), '<a>The full story&nbsp;&rarr;</a>');
  assert.equal(glueArrows('<a>\n  Ouroboros? <span class="x">&rarr;</span>\n</a>'), '<a>\n  Ouroboros?&nbsp;<span class="x">&rarr;</span>\n</a>');
  assert.equal(glueArrows('<a><span class="tok">spoonjoy.app</span> &#8599;</a>'), '<a><span class="tok">spoonjoy.app</span>&nbsp;&#8599;</a>');
  assert.equal(glueArrows('<a>Ouro MD on <span class="tok">ouroboros.bot</span> →</a>'), '<a>Ouro MD on <span class="tok">ouroboros.bot</span>&nbsp;→</a>');
  assert.equal(glueArrows('<p><code>drafting</code> &rarr; <code>done</code></p>'), '<p><code>drafting</code>&nbsp;&rarr; <code>done</code></p>');
});

test('an opening arrow is glued to the word after it, and a middle arrow still lets the line break after it', () => {
  assert.equal(glueArrows('<a>&larr; Lab</a>'), '<a>&larr;&nbsp;Lab</a>');
  assert.equal(glueArrows('<span>Clawdbot &rarr; Moltbot</span>'), '<span>Clawdbot&nbsp;&rarr; Moltbot</span>');
});

test('code, scripts, attributes and block boundaries are left alone', () => {
  assert.equal(glueArrows('<pre>a &rarr; b</pre><code>x → y</code>'), '<pre>a &rarr; b</pre><code>x → y</code>');
  assert.equal(glueArrows('<script>a = "x →"</script><a title="a →">b</a>'), '<script>a = "x →"</script><a title="a →">b</a>');
  assert.equal(glueArrows('<p>word</p>\n<span>→</span>'), '<p>word</p>\n<span>→</span>');
});

test('no built page leaves an ordinary space in front of an arrow', () => {
  const ARROW = /[ \t\n]+(?:&rarr;|&larr;|&#8599;|&#8594;|[←-⇿])/;
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8')
      .replace(/<(script|style|pre|svg|title|head)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, 'x')
      .replace(/<[^>]*>/g, (tag) => (/^<\/?(?:span|a|em|strong|b|i|small)\b/i.test(tag) ? '' : '\u0001'));
    const m = html.match(new RegExp(`[^\\s\\u0001]${ARROW.source}`));
    if (m) offenders.push(`${file}: "${m[0]}"`);
  }
  assert.deepEqual(offenders, []);
});
