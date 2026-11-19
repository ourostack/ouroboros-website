// The agent loop guide (/blog/build-ai-agent-from-scratch/) as a workshop
// story: one program grown in one file by prompting a coding agent, then by
// prompting the agent itself; shell variants that work without JavaScript,
// Ouro HX code blocks and cards, and the facts a learner needs when
// something goes wrong.
//   npm run build && node --test tests/agent-loop-guide.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  for (const shell of ['mac', 'powershell']) {
    assert.ok(variantBlocks(source, shell).length > 0, `no data-shell-variant="${shell}" block`);
  }
  for (const [tag] of source.matchAll(/<div\b[^>]*\bdata-shell-variant="[^"]*"[^>]*>/g)) {
    assert.doesNotMatch(tag, /\shidden(?:[\s=>])/, `hidden in server HTML: ${tag}`);
    assert.doesNotMatch(tag, /display:\s*none/, `display:none in server HTML: ${tag}`);
  }
  const text = textOf(source);
  for (const label of ['macOS, Linux or WSL terminal', 'Windows PowerShell']) {
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

test('the reader never sets variables, unsets tokens, runs a preflight or catches up', () => {
  const text = textOf(article());
  for (const banned of ['GITHUB_TOKEN', 'COPILOT_API', 'OPENAI_API_KEY', 'unset ', 'export ', '$env:', 'preflight', 'empty folder', 'undocumented', 'catch up', 'catch-up', 'Catch up']) {
    assert.ok(!text.includes(banned), `the guide says "${banned}"`);
  }
});

test('one program in one file: every run is node agent.ts', () => {
  const source = article();
  const text = textOf(source);
  for (const name of ['m1.ts', 'm2.ts', 'm3.ts', 'm4.ts', '--show-messages']) {
    assert.ok(!text.includes(name), `the guide names ${name}`);
  }
  const runs = [...source.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(([, inner]) => textOf(inner)).filter((t) => /^node /.test(t));
  assert.ok(runs.length >= 3, `expected a run command per milestone, found ${runs.length}`);
  for (const run of runs) assert.match(run, /^node agent\.ts$/, `unexpected run command: ${run}`);
});

test('every run is followed by what my terminal showed', () => {
  const source = article();
  const blocks = [...source.matchAll(/<figure\b([^>]*)>(?:(?!<\/figure>)[\s\S])*?<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(([, attrs, inner]) => ({
    output: /data-expected-output/.test(attrs),
    text: textOf(inner),
  }));
  const runs = blocks.map((b, i) => [b, i]).filter(([b]) => /^node agent\.ts/.test(b.text));
  for (const [run, i] of runs) {
    assert.ok(blocks[i + 1]?.output, `no output after "${run.text}"`);
  }
  for (const block of blocks.filter((b) => b.output)) {
    assert.ok(block.text.trim().length > 0, 'an empty output block');
  }
});

// Light content pin: the outputs are real terminal text, so they show the prompt they came from.
test('every output is a real one from the dry run', () => {
  assert.ok(!html().includes('DRYRUN_PENDING'), 'the page still shows DRYRUN_PENDING in place of real output');
  const outputs = [...article().matchAll(/<figure\b([^>]*)>(?:(?!<\/figure>)[\s\S])*?<pre\b[^>]*>([\s\S]*?)<\/pre>/g)]
    .filter(([, attrs]) => /data-expected-output/.test(attrs))
    .map(([, , inner]) => textOf(inner));
  assert.ok(outputs.length >= 10, `expected at least 10 output blocks, found ${outputs.length}`);
  for (const text of outputs) assert.ok(text.length >= 40, `an output block is too short to be real: ${text}`);
  const joined = outputs.join('\n');
  assert.match(joined, /\[tool\] (read_file|write_file|shell)/, 'no output shows a tool running');
  assert.match(joined, /Tool result:/, 'no output shows the model stuck waiting on a tool');
  assert.match(joined, /reasoning_opaque/, 'no output shows the saved conversation');
  assert.match(joined, /node agent\.ts You: \S/, 'no output shows the agent\'s real "You:" prompt');
});

test('the model\'s thinking shows dimmed and its reply does not', () => {
  const source = article();
  assert.ok(!source.includes('\x1b') && !source.includes('&#x1b;') && !source.includes('&#27;'), 'raw escape codes show on the page');
  const outputs = [...source.matchAll(/<figure\b([^>]*)>(?:(?!<\/figure>)[\s\S])*?<pre\b[^>]*>([\s\S]*?)<\/pre>/g)]
    .filter(([, attrs]) => /data-expected-output/.test(attrs) && /data-language="ansi"/.test(attrs));
  assert.ok(outputs.length >= 10, `expected at least 10 terminal outputs, found ${outputs.length}`);
  const first = outputs[0][2];
  // Split the first run into its dim spans and the rest, past the spans code-wrap nests inside them.
  const dim = [];
  let rest = '';
  let at = 0;
  for (const m of first.matchAll(/<span\b[^>]*data-ouro-ansi[^>]*class="[^"]*muted-foreground[^"]*"[^>]*>/g)) {
    if (m.index < at) continue;
    const tags = /<(\/?)span\b[^>]*>/g;
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let t;
    while (depth && (t = tags.exec(first))) depth += t[1] ? -1 : 1;
    rest += first.slice(at, m.index);
    dim.push(textOf(first.slice(m.index + m[0].length, t.index)));
    at = t.index + t[0].length;
  }
  rest = textOf(rest + first.slice(at));
  assert.ok(dim.some((t) => t.includes('five-word greeting')), 'the first run\'s thinking is not dimmed');
  assert.ok(rest.includes('Hi there, how are you?'), 'the first run\'s reply is dimmed or missing');
  assert.ok(!rest.includes('five-word greeting'), 'the first run\'s thinking is not dimmed');
});

test('one disclosure, up top, that every output is real', () => {
  const text = textOf(article());
  const count = text.split('Every output on this page is real').length - 1;
  assert.equal(count, 1, `the disclosure appears ${count} times`);
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

test('no agent SDK, no standards name-drops and no style reference', () => {
  const text = textOf(html());
  for (const banned of ['Ted Lasso', '@github/copilot-sdk', '@openai/agents', 'agentskills', 'Agent Skills standard', 'universal basis']) {
    assert.ok(!text.includes(banned), `page mentions ${banned}`);
  }
});

test('troubleshooting covers the real errors', () => {
  const section = html().match(/<[^>]*\bid="troubleshooting"[\s\S]*?<\/table>/);
  assert.ok(section, 'no #troubleshooting table');
  const text = textOf(section[0]);
  for (const needle of ['401', '403', '404', 'quota exceeded', 'secrets.txt', 'content filter', 'gh auth login', 'gh auth switch', '22.18', 'copilot', 'PowerShell']) {
    assert.ok(text.includes(needle), `troubleshooting lacks ${needle}`);
  }
  assert.ok(!html().includes('quota-fix'), 'a link to the removed quota fix');
});

// The starter is the first half's own output (ourostack/my-agent), shown in full so readers can just read it.
test('the starter is the loop the first half builds, shown in full', () => {
  const text = textOf(article());
  assert.ok(text.includes('git clone https://github.com/ourostack/my-agent'), 'no clone command for the starter');
  const starter = fs.readFileSync('src/data/grow-an-agent/agent.ts.txt', 'utf8');
  for (const line of starter.split('\n').filter((l) => l.trim().startsWith('//'))) {
    assert.ok(text.includes(textOf(line.trim())), `the page's starter lacks: ${line.trim()}`);
  }
  assert.ok(html().includes('href="#start-from-the-loop"'), 'nothing points second-half readers to the starter');
});

test('AGENTS.md is the note the page shows and the reader downloads', () => {
  const note = fs.readFileSync('public/grow-an-agent/AGENTS.md', 'utf8');
  const text = textOf(article());
  for (const line of note.split('\n').filter((l) => l.startsWith('- '))) {
    assert.ok(text.includes(textOf(line.slice(2))), `the page's AGENTS.md lacks: ${line}`);
  }
  assert.match(note, /Commit each step/, 'AGENTS.md no longer asks for commits');
  assert.ok(text.includes('https://ouroboros.bot/grow-an-agent/AGENTS.md'), 'no download command for AGENTS.md');
  assert.ok(hrefsOf(html()).includes('https://agents.md/'), 'no link explaining AGENTS.md');
});

test('cites the sources it leans on', () => {
  const hrefs = hrefsOf(html());
  assert.ok(hrefs.some((h) => h.startsWith('https://openclaw.ai')), 'no OpenClaw link');
  assert.ok(hrefs.some((h) => h.includes('lexfridman.com/peter-steinberger-transcript')), 'no transcript link');
});

test('the ending names what the loop became', () => {
  const hrefs = hrefsOf(html());
  for (const href of ['/lab/story/', '/butler/', '/apps/', '/desk/']) {
    assert.ok(hrefs.includes(href), `no link to ${href}`);
  }
});

// Coding-agent prompts lean on AGENTS.md for commits; prompts to your own agent ask for them.
test('every prompt says who it is for, and every main-path prompt to your agent commits', () => {
  const source = html();
  const text = textOf(source);
  for (const label of ['Prompt the coding agent', 'Prompt your agent']) {
    assert.ok(text.includes(label), `no "${label}" label`);
  }
  const labels = [...source.matchAll(/<p class="prompt-label"[^>]*>([\s\S]*?)<\/p>/g)].map(([, inner]) => textOf(inner));
  const all = prompts(source);
  assert.equal(labels.length, all.length, 'a prompt card without a label');
  for (const label of labels) assert.ok(['Prompt the coding agent', 'Prompt your agent'].includes(label), `unexpected prompt label: ${label}`);
  const sideQuests = [...source.matchAll(/<section\b[^>]*\bdata-side-quest\b[\s\S]*?<\/section>/g)].map(([whole]) => whole).join('');
  const sideQuestPrompts = new Set(prompts(sideQuests));
  const toAgent = [...source.matchAll(/<p class="prompt-label"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<pre\b[^>]*class="prompt-frame[^"]*"[^>]*>([\s\S]*?)<\/pre>/g)]
    .filter(([, label]) => textOf(label) === 'Prompt your agent').map(([, , inner]) => textOf(inner));
  assert.ok(toAgent.length >= 4, `expected at least 4 prompts to your agent, found ${toAgent.length}`);
  for (const prompt of toAgent) {
    if (sideQuestPrompts.has(prompt)) continue;
    assert.match(prompt, /[Cc]ommit/, `a prompt doesn't commit: ${prompt.slice(0, 80)}`);
  }
});

test('the first prompt reaches the model through gh and Copilot', () => {
  const first = prompts(html())[0];
  for (const needle of ['gh auth token', 'gh api /copilot_internal/user --jq .endpoints.api', 'claude-opus-5.5', 'agent.ts', 'openai']) {
    assert.ok(first.includes(needle), `the first prompt lacks ${needle}`);
  }
});

test('the byline keeps the publication date and notes the update', () => {
  const source = html();
  assert.match(source, /Ari Mendelow &middot; March 2026 &middot; Updated November 2026/, 'byline');
  assert.ok(source.includes('"datePublished":"2026-03-01"'), 'datePublished');
  assert.ok(source.includes('"dateModified":"2026-11-18"'), 'dateModified');
});

test('no screenshots: each output shows once, as the text the terminal printed', () => {
  const source = article();
  assert.ok(!/<figure\b[^>]*class="shot"/.test(source), 'a screenshot figure came back');
  assert.ok(!/\/blog\/build-ai-agent-from-scratch\/[^"]+\.webp/.test(source), 'a guide screenshot is still linked');
});
