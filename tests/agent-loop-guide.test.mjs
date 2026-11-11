// The agent loop guide (/blog/build-ai-agent-from-scratch/) as a workshop
// story: shell variants that work without JavaScript, side quests as cards,
// and the facts a learner needs when something goes wrong.
//   npm run build && node --test tests/agent-loop-guide.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, textOf, hrefsOf } from './support/dist.mjs';

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

test('links Steinberger at the moment', () => {
  const hrefs = hrefsOf(html());
  assert.ok(hrefs.some((h) => h.includes('YFjfBk8HI5o') && h.includes('t=9298')), 'no timestamped Steinberger link');
});

test('no agent SDK and no style reference', () => {
  const text = textOf(html());
  for (const banned of ['Ted Lasso', '@github/copilot-sdk', '@openai/agents']) {
    assert.ok(!text.includes(banned), `page mentions ${banned}`);
  }
});

test('troubleshooting covers the real errors', () => {
  const text = textOf(html());
  for (const needle of ['OPENAI_API_KEY', '401', '429', 'gh auth switch']) {
    assert.ok(text.includes(needle), `troubleshooting lacks ${needle}`);
  }
});

test('every milestone links its catch-up file', () => {
  const hrefs = hrefsOf(html());
  for (const file of ['package.json', 'preflight.mjs', 'm1.ts', 'm2.ts', 'm3.ts', 'm4.ts']) {
    assert.ok(hrefs.includes(`/agent-loop/${file}`), `no link to /agent-loop/${file}`);
  }
});

test('the ending names what the loop became', () => {
  const hrefs = hrefsOf(html());
  for (const href of ['/lab/story/', '/butler/', '/apps/', '/desk/']) {
    assert.ok(hrefs.includes(href), `no link to ${href}`);
  }
});

test('prompts merge all choices', () => {
  const prompts = [...html().matchAll(/<pre\b[^>]*class="prompt-frame[^"]*"[^>]*>([\s\S]*?)<\/pre>/g)].map(([, inner]) => textOf(inner));
  assert.ok(prompts.length > 0, 'no prompt cards');
  assert.ok(prompts.some((p) => p.includes('choices') && p.includes('tool_calls')), 'no prompt asks to merge choices and tool_calls');
});

test('the quota fix and the shell prompt match the catch-up files', () => {
  const source = html();
  const unix = preBlocks(source, 'mac').join('\n');
  const ps = preBlocks(source, 'powershell').join('\n');
  assert.ok(unix.includes('unset GH_TOKEN') && unix.includes('export GITHUB_TOKEN=$(gh auth token --user <name>)'), 'no bash / zsh quota fix');
  assert.ok(ps.includes('Remove-Item Env:GH_TOKEN') && ps.includes('$env:GITHUB_TOKEN = gh auth token --user <name>'), 'no PowerShell quota fix');
  assert.match(textOf(source), /Replace <name> with/, 'nothing tells readers to replace <name>');
  const prompts = [...source.matchAll(/<pre\b[^>]*class="prompt-frame[^"]*"[^>]*>([\s\S]*?)<\/pre>/g)].map(([, inner]) => textOf(inner)).join('\n');
  for (const needle of ['powershell.exe -NoProfile -NonInteractive -Command', '/bin/sh -c', 'UTF-8']) {
    assert.ok(prompts.includes(needle), `the m4 prompt lacks ${needle}`);
  }
});
