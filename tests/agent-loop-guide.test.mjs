// The agent loop guide (/blog/build-ai-agent-from-scratch/) as a workshop
// story: shell variants that work without JavaScript, side quests as cards,
// and the facts a learner needs when something goes wrong.
//   npm run build && node --test tests/agent-loop-guide.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, textOf } from './support/dist.mjs';

const PAGE = 'blog/build-ai-agent-from-scratch/index.html';
const html = () => readDist(PAGE);

function preBlocks(source, shell) {
  const pattern = new RegExp(`<pre\\b[^>]*\\bdata-shell="${shell}"[^>]*>([\\s\\S]*?)</pre>`, 'g');
  return [...source.matchAll(pattern)].map(([, inner]) => textOf(inner));
}

test('all shell variants render without JS', () => {
  const source = html();
  for (const shell of ['mac', 'powershell', 'wsl']) {
    assert.ok(source.includes(`data-shell="${shell}"`), `no data-shell="${shell}" block`);
  }
  for (const [tag] of source.matchAll(/<(?:pre|div)\b[^>]*\bdata-shell(?:-variant)?="[^"]*"[^>]*>/g)) {
    assert.doesNotMatch(tag, /\shidden(?:[\s=>])/, `hidden in server HTML: ${tag}`);
    assert.doesNotMatch(tag, /display:\s*none/, `display:none in server HTML: ${tag}`);
  }
  const text = textOf(source);
  for (const label of ['macOS Terminal', 'Windows PowerShell', 'WSL']) {
    assert.ok(text.includes(label), `no visible "${label}" label`);
  }
});

test('PowerShell variants never use &&', () => {
  const blocks = preBlocks(html(), 'powershell');
  assert.ok(blocks.length > 0, 'no PowerShell blocks');
  for (const block of blocks) {
    assert.ok(!block.includes('&&'), `&& in PowerShell: ${block}`);
    assert.ok(!block.includes('export '), `export in PowerShell: ${block}`);
  }
});

test('side quests are cards, not collapsibles', () => {
  const source = html();
  assert.ok(!/<details\b/i.test(source), 'the guide uses <details>');
  const quests = [...source.matchAll(/<aside\b[^>]*\bdata-side-quest\b[^>]*>([\s\S]*?)<\/aside>/g)];
  assert.ok(quests.length >= 3, `expected at least 3 side quests, found ${quests.length}`);
  for (const [whole, inner] of quests) {
    const id = whole.match(/\bid="([^"]+)"/)?.[1];
    assert.ok(id, `side quest without an id: ${whole.slice(0, 120)}`);
    const outside = source.replace(whole, '');
    assert.ok(outside.includes(`href="#${id}"`), `nothing links to #${id}`);
    const back = inner.match(/<a\b[^>]*href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)?.find((a) => textOf(a) === 'Back to the main path');
    assert.ok(back, `#${id} has no "Back to the main path" link`);
    const target = back.match(/href="#([^"]+)"/)[1];
    assert.ok(source.includes(`id="${target}"`), `#${id} links back to missing #${target}`);
  }
});
