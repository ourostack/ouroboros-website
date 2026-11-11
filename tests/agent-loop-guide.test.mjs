// The agent loop guide (/blog/build-ai-agent-from-scratch/) as a workshop
// story: one program grown in one file, shell variants that work without
// JavaScript, Ouro HX code blocks and cards, and the facts a learner needs
// when something goes wrong.
//   npm run build && node --test tests/agent-loop-guide.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, textOf, hrefsOf } from './support/dist.mjs';

const PAGE = 'blog/build-ai-agent-from-scratch/index.html';
const html = () => readDist(PAGE);
const article = () => html().match(/<article\b[\s\S]*<\/article>/)[0];

function variantBlocks(source, shell) {
  const pattern = new RegExp(`<div\\b[^>]*\\bdata-shell-variant="${shell}"[^>]*>[\\s\\S]*?<pre\\b[^>]*>([\\s\\S]*?)</pre>`, 'g');
  return [...source.matchAll(pattern)].map(([, inner]) => textOf(inner));
}

const prompts = (source) =>
  [...source.matchAll(/<pre\b[^>]*class="prompt-frame[^"]*"[^>]*>([\s\S]*?)<\/pre>/g)].map(([, inner]) => textOf(inner));

test('all shell variants render without JS, under their own captions', () => {
  const source = html();
  for (const shell of ['mac', 'powershell', 'wsl']) {
    assert.ok(variantBlocks(source, shell).length > 0, `no data-shell-variant="${shell}" block`);
  }
  for (const [tag] of source.matchAll(/<div\b[^>]*\bdata-shell-variant="[^"]*"[^>]*>/g)) {
    assert.doesNotMatch(tag, /\shidden(?:[\s=>])/, `hidden in server HTML: ${tag}`);
    assert.doesNotMatch(tag, /display:\s*none/, `display:none in server HTML: ${tag}`);
  }
  const text = textOf(source);
  for (const label of ['macOS Terminal', 'Windows PowerShell', 'WSL']) {
    assert.ok(text.includes(label), `no visible "${label}" caption`);
  }
});

test('the shell switcher is Ouro HX, hidden until a shell is picked', () => {
  const source = html();
  const control = source.match(/<div\b[^>]*\bdata-shell-control\b[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*data-shell-variant/);
  assert.ok(control, 'no shell control');
  assert.match(control[1], /data-ouro="segmented-control"/, 'the shell control is not HX SegmentedControl');
  assert.match(source, /html:not\(\[data-shell-active\]\) \[data-shell-control\]\s*{\s*display:\s*none/, 'the control shows without JavaScript');
  assert.ok(source.includes("localStorage.getItem('ouroboros-agent-loop-shell')"), 'the saved shell is not read before paint');
});

test('PowerShell variants never use && or export', () => {
  const blocks = variantBlocks(html(), 'powershell');
  for (const block of blocks) {
    assert.ok(!block.includes('&&'), `&& in PowerShell: ${block}`);
    assert.ok(!block.includes('export '), `export in PowerShell: ${block}`);
  }
});

test('the reader never sets variables, unsets tokens or runs a preflight', () => {
  const text = textOf(article());
  for (const banned of ['GITHUB_TOKEN', 'COPILOT_API', 'unset ', 'export ', '$env:', 'preflight', 'empty folder', 'undocumented']) {
    assert.ok(!text.includes(banned), `the guide says "${banned}"`);
  }
});

test('one program in one file: every run is node agent.ts', () => {
  const source = article();
  const text = textOf(source);
  for (const name of ['m1.ts', 'm2.ts', 'm3.ts', 'm4.ts']) {
    assert.ok(!text.includes(name), `the guide names ${name}`);
  }
  const runs = [...source.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(([, inner]) => textOf(inner)).filter((t) => /^node /.test(t));
  assert.ok(runs.length >= 5, `expected a run command per milestone, found ${runs.length}`);
  for (const run of runs) assert.match(run, /^node agent\.ts( --show-messages)?$/, `unexpected run command: ${run}`);
});

test('every run is followed by what the terminal shows', () => {
  const source = article();
  const blocks = [...source.matchAll(/<figure\b([^>]*)>[\s\S]*?<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(([, attrs, inner]) => ({
    output: /data-expected-output/.test(attrs),
    text: textOf(inner),
  }));
  const runs = blocks.map((b, i) => [b, i]).filter(([b]) => /^node agent\.ts/.test(b.text));
  for (const [run, i] of runs) {
    const next = blocks[i + 1];
    assert.ok(next?.output, `no expected output after "${run.text}"`);
    assert.ok(next.text.startsWith(`$ ${run.text}`), `the output after "${run.text}" doesn't start with the command`);
  }
  const outputs = blocks.filter((b) => b.output).map((b) => b.text).join('\n');
  for (const line of ['you> ', 'agent> ', '[read_file] {"path":"secret.txt"}', 'The model asked for a tool call:', '"role": "tool"']) {
    assert.ok(outputs.includes(line), `no expected output shows ${line}`);
  }
  assert.match(textOf(source), /Example: the model's words will vary\./, 'model replies are not marked as examples');
  // Every run of the program shows the model at work, so each says it's an example.
  for (const [, attrs, inner, after] of source.matchAll(/<figure\b([^>]*)>[\s\S]*?<pre\b[^>]*>([\s\S]*?)<\/pre>[\s\S]*?<\/figure>((?:\s*(?:<\/[a-z-]+>|<!--[\s\S]*?-->))*\s*<[^>]*>)/g)) {
    if (!/data-expected-output/.test(attrs) || !/^\$ node agent\.ts/.test(textOf(inner))) continue;
    assert.match(after, /<p class="output-note"/, `no example note after: ${textOf(inner).split('\n')[0]}`);
  }
});

test('code and commands are HX code blocks; keys are HX kbd', () => {
  const source = article();
  assert.ok(/data-ouro="code-block"/.test(source), 'no HX code blocks');
  assert.ok(/<kbd\b[^>]*data-ouro="kbd"/.test(source), 'no HX kbd');
  assert.ok(!/class="shell-code"|data-shell="/.test(source), 'the bespoke shell switch survived');
});

test('side quests are HX cards, not collapsibles', () => {
  const source = html();
  assert.ok(!/<details\b/i.test(source), 'the guide uses <details>');
  const quests = [...source.matchAll(/<section\b[^>]*\bdata-side-quest\b[^>]*>([\s\S]*?)<\/section>/g)];
  assert.ok(quests.length >= 3, `expected at least 3 side quests, found ${quests.length}`);
  for (const [whole, inner] of quests) {
    assert.match(whole, /data-ouro="card"/, 'a side quest is not an HX card');
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
  assert.ok(!textOf(html()).includes('Lex reminded'), 'play-by-play of the conversation');
});

test('no agent SDK and no style reference', () => {
  const text = textOf(html());
  for (const banned of ['Ted Lasso', '@github/copilot-sdk', '@openai/agents']) {
    assert.ok(!text.includes(banned), `page mentions ${banned}`);
  }
});

test('troubleshooting covers the real errors', () => {
  const text = textOf(html());
  for (const needle of ['OPENAI_API_KEY', '401', '429', 'gh auth switch', 'gh auth login']) {
    assert.ok(text.includes(needle), `troubleshooting lacks ${needle}`);
  }
  assert.ok(!html().includes('quota-fix'), 'a link to the removed quota fix');
});

test('catching up is one finished file', () => {
  const hrefs = hrefsOf(html());
  for (const file of ['agent.ts', 'package.json']) {
    assert.ok(hrefs.includes(`/agent-loop/${file}`), `no link to /agent-loop/${file}`);
  }
});

test('the ending names what the loop became', () => {
  const hrefs = hrefsOf(html());
  for (const href of ['/lab/story/', '/butler/', '/apps/', '/desk/']) {
    assert.ok(hrefs.includes(href), `no link to ${href}`);
  }
});

test('the first prompt does the setup, and every prompt to the coding agent commits', () => {
  const all = prompts(html());
  assert.ok(all.length > 0, 'no prompt cards');
  const setup = all[0];
  for (const needle of ['22.18', 'gh api /copilot_internal/user', 'npm init -y', 'npm install openai', 'atomic commits']) {
    assert.ok(setup.includes(needle), `the setup prompt lacks ${needle}`);
  }
  for (const prompt of all) assert.match(prompt, /Commit/, `a prompt doesn't commit: ${prompt.slice(0, 80)}`);
});

test('prompts merge all choices and resolve the model through gh', () => {
  const all = prompts(html()).join('\n');
  assert.ok(prompts(html()).some((p) => p.includes('choices') && p.includes('tool_calls')), 'no prompt asks to merge choices and tool_calls');
  for (const needle of ['gh auth token', 'gh api /copilot_internal/user --jq .endpoints.api', 'powershell.exe -NoProfile -NonInteractive -Command', '/bin/sh -c', 'UTF-8']) {
    assert.ok(all.includes(needle), `the prompts lack ${needle}`);
  }
});

test('the byline keeps the publication date and notes the update', () => {
  const source = html();
  assert.match(source, /Ari Mendelow &middot; March 2026 &middot; Updated November 2026/, 'byline');
  assert.ok(source.includes('"datePublished":"2026-03-01"'), 'datePublished');
  assert.ok(source.includes('"dateModified":"2026-11-11"'), 'dateModified');
});
