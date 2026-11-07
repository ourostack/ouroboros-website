import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { listHtmlFiles, distDir, textOf } from './support/dist.mjs';

// Every code block and every prompt a reader might paste carries the shared
// Copy button (taste review r16, 2026-11-07: the tutorial's 11 code blocks had
// no Copy, and its prompts were italic blockquotes instead of the copyable
// prompt box). ouro.bot runs the same check (ourostack/ouro-apps-site,
// tests/copy-coverage.test.mjs).
//
// A <pre> passes when a button copies it (data-copy-target="<its id>"), when
// it is a prompt box's frame (PromptCard copies its data-prompt), or when it
// says why there is nothing to paste: data-copy-exempt="<reason>", for a demo
// that plays or text shown as evidence.
//
// A prompt passes only inside the prompt box: an italic block that is all one
// quotation of a sentence or more is a prompt written as a blockquote, and
// fails. A <blockquote> quoting what someone said is not a prompt.

const pages = listHtmlFiles().map((file) => [path.relative(distDir, file), fs.readFileSync(file, 'utf8')]);

test('every code block has a Copy button, or says why it has none', () => {
  const missing = [];
  for (const [page, html] of pages) {
    const targets = new Set([...html.matchAll(/data-copy-target="([^"]+)"/g)].map(([, id]) => id));
    for (const [tag] of html.matchAll(/<pre\b[^>]*>/g)) {
      if (/\bdata-copy-exempt="[^"]+"/.test(tag)) continue;
      if (/\bclass="[^"]*\bprompt-frame\b/.test(tag)) continue;
      const id = tag.match(/\bid="([^"]+)"/)?.[1];
      if (id && targets.has(id)) continue;
      missing.push(`${page}: ${tag.slice(0, 90)}`);
    }
  }
  assert.deepEqual(missing, [], 'A code block has no Copy button and no data-copy-exempt reason');
});

test('every prompt box frame sits beside its own Copy button', () => {
  const bad = [];
  for (const [page, html] of pages) {
    const cards = html.split(/<div class="prompt-card"/).slice(1);
    for (const card of cards) {
      const head = card.slice(0, card.indexOf('prompt-frame'));
      if (!/data-prompt="[^"]+"/.test(head) || !/>Copy</.test(head)) bad.push(page);
    }
  }
  assert.deepEqual(bad, [], 'A prompt box lost its Copy button');
});

test('no prompt is set as an italic quotation outside the prompt box', () => {
  const stray = [];
  for (const [page, html] of pages) {
    for (const m of html.matchAll(/<(p|aside|div|em)\b[^>]*\bclass="[^"]*\bitalic\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)) {
      const before = html.slice(0, m.index);
      if ((before.match(/<blockquote\b/g) || []).length > (before.match(/<\/blockquote>/g) || []).length) continue;
      const text = textOf(m[2]);
      if (/^["“]/.test(text) && /["”]$/.test(text) && text.split(/\s+/).length >= 8) stray.push(`${page}: ${text.slice(0, 70)}`);
    }
  }
  assert.deepEqual(stray, [], 'A prompt is an italic quotation, not the copyable prompt box');
});
