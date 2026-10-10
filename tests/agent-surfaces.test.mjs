import assert from 'node:assert/strict';
import test from 'node:test';
import { readDist, distExists, textOf } from './support/dist.mjs';

const principles = [
  'Talk through intent and judgement together',
  'Delegate whole outcomes, not steps',
  'Make context durable',
  'Give agents meaningful authority, with clear boundaries',
  'Verify the actual result, not plausible progress',
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
});

test('llms.txt points agents at the method pages', () => {
  const llms = readDist('llms.txt');
  for (const route of ['/approach/', '/brief.md', '/desk/', '/ouro-md/', '/essays/']) {
    assert.ok(llms.includes(`https://ouroboros.bot${route}`), `llms.txt is missing ${route}`);
  }
  assert.doesNotMatch(llms, /<[a-z][^>]*>/i);
  assert.doesNotMatch(llms, /Every page is written for people and for the agents/);
  assert.doesNotMatch(llms, /a real prompt and an agent note for each principle/, 'Principle 3 has an exhibit, not a prompt');
  assert.doesNotMatch(llms, /give your agent/i, 'llms.txt speaks to the agent, not about it');
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
