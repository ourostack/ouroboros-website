import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readDist, distExists, textOf } from './support/dist.mjs';
import { redirectFor } from '../src/worker/redirects.mjs';

// Ari's original titles (copy deck, 2026-10-11).
const principles = [
  'Talk through intent and judgment',
  'Delegate whole outcomes',
  'Make context durable',
  'Give agents meaningful authority, with clear boundaries',
  'Verify the actual result',
];
const deskSetupUrl = 'https://github.com/ourostack/desk/blob/main/SETUP.md';

test('brief.md is plain text an agent can read, under 6,000 characters', () => {
  assert.ok(distExists('brief.md'));
  const brief = readDist('brief.md');
  assert.ok(brief.length < 6000, `brief.md is ${brief.length} characters`);
  assert.doesNotMatch(brief, /<[a-z][^>]*>/i, 'brief.md must not contain HTML');
  for (const p of principles) assert.ok(brief.includes(p), `brief.md is missing "${p}"`);
  // The brief's reader is the agent: it fetches the setup link itself once its person says yes.
  assert.ok(brief.includes(`If they want it, open ${deskSetupUrl} and follow it.`), 'brief.md must tell the agent to open the Desk setup link');
  assert.doesNotMatch(brief, /give your agent/i, 'brief.md speaks to the agent, not about it');
  assert.match(brief, /GitHub issue/i);
  assert.match(brief, /file/i);
  assert.ok(brief.includes("It's an alpha for Claude Code and GitHub Copilot CLI."), 'brief.md names both tested harnesses');
  assert.doesNotMatch(brief, /not plausible progress|judgement/);
});

test('llms.txt points agents at the method pages', () => {
  const llms = readDist('llms.txt');
  for (const twin of ['/approach/index.md', '/brief.md', '/desk/index.md', '/ouro-md/index.md', '/blog/index.md', '/lab/story/index.md']) {
    assert.ok(llms.includes(`(https://ouroboros.bot${twin})`), `llms.txt is missing ${twin}`);
  }
  assert.doesNotMatch(llms, /<[a-z][^>]*>/i);
  assert.doesNotMatch(llms, /Every page is written for people and for the agents/);
  assert.doesNotMatch(llms, /a real prompt and an agent note for each principle/, 'Principle 3 has an exhibit, not a prompt');
  // The essay "Give your agent a home" is quoted by its real title.
  assert.doesNotMatch(llms.replaceAll('[Give your agent a home]', ''), /give your agent/i, 'llms.txt speaks to the agent, not about it');
});

test('brief page shows the same text as brief.md, wraps long lines and has a copy button', () => {
  const html = readDist('brief/index.html');
  const brief = readDist('brief.md');
  const pre = html.match(/<pre\b[^>]*class="[^"]*\bagent-text\b[^"]*"[^>]*>([\s\S]*?)<\/pre>/);
  assert.ok(pre, 'Brief must render in a pre.agent-text');
  assert.equal(textOf(pre[1]), brief.replace(/\s+/g, ' ').trim(), 'Brief page and brief.md drifted');
  assert.match(html, /<button\b[^>]*data-copy-target/);
  assert.match(html, /href="\/brief\.md"/);
});

test('agent text wraps instead of scrolling the page sideways at 375px', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = path.join(process.cwd(), 'dist', '_astro');
  const css = fs.readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const rule = css.match(/\.agent-text\{([^}]*)\}/);
  assert.ok(rule, 'Missing .agent-text rule');
  assert.match(rule[1], /white-space:pre-wrap/);
  assert.match(rule[1], /overflow-wrap:anywhere/);
});

test('copy buttons fall back to selecting the text without the Clipboard API', () => {
  for (const file of ['brief/index.html', 'desk/index.html', 'ouro-md/index.html']) {
    const html = readDist(file);
    assert.match(html, /data-copy-target=/, `${file} has a copy button`);
    assert.match(html, /selectNodeContents/, `${file} needs the select fallback`);
  }
});

// Root final ruling F5 (2026-10-11) kept every line llms.txt was first published
// with: a block of non-spec lines (User-Agent:, Purpose:, Read:, Docs:,
// Skills-Manifest:) under "#" comments, which Markdown reads as headings. Ari,
// 2026-11-16, asked that llms.txt be made optimal, so it now follows
// llmstxt.org v2 (tests/llms.test.mjs) and that block is gone. What agents may
// rely on is the addresses it named: every one of them still answers.
test('every address the first published llms.txt named still answers, directly or by redirect', () => {
  const published = fs.readFileSync(new URL('./fixtures/llms-published.txt', import.meta.url), 'utf8');
  const urls = [...published.matchAll(/https:\/\/ouroboros\.bot(\/[^\s]*)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 8);
  for (const url of urls) {
    const file = url.replace(/\/?$/, url.includes('.') ? '' : '/index.html').slice(1);
    assert.ok(distExists(file) || redirectFor(url), `${url} no longer answers`);
  }
});

test('llms.txt opens with the workshop, names /approach by its title, and links the harness pages at /lab/', () => {
  const llms = readDist('llms.txt');
  assert.ok(llms.startsWith('# ouroboros.bot\n'), 'The workshop section comes first');
  assert.ok(llms.includes('- [How I work with agents](https://ouroboros.bot/approach/index.md): '));
  assert.doesNotMatch(llms, /\[The approach\]/);
  assert.doesNotMatch(llms, /public entrypoint/);
  assert.doesNotMatch(llms, /https:\/\/ouroboros\.bot\/(why|story|docs|what-is-an-agent-harness)\b/, 'Harness pages use their /lab/ paths');
});

// Federighi review (2026-11-09): an agent reads the family by the bar's names.
// The section is built from src/data/family.json, and Ouro UI is one entry.
test('llms.txt lists the Ouro family from family.json, by the names the family bar uses', () => {
  const llms = readDist('llms.txt');
  const family = JSON.parse(fs.readFileSync(new URL('../src/data/family.json', import.meta.url), 'utf8')).links;
  const at = llms.indexOf('## The Ouro family');
  const section = llms.slice(at, llms.indexOf('\n## ', at + 1));
  assert.deepEqual([...section.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)$/gm)].map((m) => [m[1], m[2]]), family.map((l) => [l.label, l.href]));
  assert.ok(!llms.includes('{{family}}'));
  assert.equal(llms.match(/^- \[Ouro UI\]\(https:\/\/ui\.ouroboros\.bot\/\)$/gm).length, 1, 'Ouro UI once in the family');
  assert.equal(llms.match(/^- \[Ouro UI\]\(https:\/\/ui\.ouroboros\.bot\/llms\.txt\): /gm).length, 1, 'and once in the tools, by its own llms.txt');
  assert.doesNotMatch(llms, /\[Ouro HX\]|Ouro UI \/ Ouro HX/);
});
