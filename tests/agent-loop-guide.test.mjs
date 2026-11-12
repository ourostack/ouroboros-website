// The agent loop guide (/blog/build-ai-agent-from-scratch/) as a workshop
// story: one program grown in one file by prompting a coding agent, then by
// prompting the agent itself; shell variants that work without JavaScript,
// Ouro HX code blocks and cards, and the facts a learner needs when
// something goes wrong.
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
  const blocks = [...source.matchAll(/<figure\b([^>]*)>[\s\S]*?<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(([, attrs, inner]) => ({
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

// Fails until the controller pastes the dry run's real outputs into the page.
test('every output is a real one from the dry run', () => {
  assert.ok(!html().includes('DRYRUN_PENDING'), 'pending dry run: the page still shows DRYRUN_PENDING in place of real output');
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

test('no agent SDK and no style reference', () => {
  const text = textOf(html());
  for (const banned of ['Ted Lasso', '@github/copilot-sdk', '@openai/agents']) {
    assert.ok(!text.includes(banned), `page mentions ${banned}`);
  }
});

test('troubleshooting covers the real errors', () => {
  const section = html().match(/<[^>]*\bid="troubleshooting"[\s\S]*?<\/table>/);
  assert.ok(section, 'no #troubleshooting table');
  const text = textOf(section[0]);
  for (const needle of ['401', '403', '404', 'gh auth login', 'gh auth switch', '22.18', 'copilot', 'PowerShell']) {
    assert.ok(text.includes(needle), `troubleshooting lacks ${needle}`);
  }
  assert.ok(!html().includes('quota-fix'), 'a link to the removed quota fix');
});

test('the finished file is one link away', () => {
  const hrefs = hrefsOf(html());
  assert.ok(hrefs.includes('/agent-loop/agent.ts'), 'no link to /agent-loop/agent.ts');
});

test('cites the sources it leans on', () => {
  const hrefs = hrefsOf(html());
  assert.ok(hrefs.some((h) => h.startsWith('https://agentskills.io')), 'no Agent Skills link');
  assert.ok(hrefs.some((h) => h.startsWith('https://openclaw.ai')), 'no OpenClaw link');
  assert.ok(hrefs.some((h) => h.includes('lexfridman.com/peter-steinberger-transcript')), 'no transcript link');
});

test('the ending names what the loop became', () => {
  const hrefs = hrefsOf(html());
  for (const href of ['/lab/story/', '/butler/', '/apps/', '/desk/']) {
    assert.ok(hrefs.includes(href), `no link to ${href}`);
  }
});

test('every prompt says who it is for, and every main-path prompt commits', () => {
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
  for (const prompt of all) {
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
  assert.ok(source.includes('"dateModified":"2026-11-11"'), 'dateModified');
});
