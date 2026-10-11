import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readiness, allowedLabels } from '../src/data/readiness.mjs';
import { readDist, textOf, hrefsOf, listHtmlFiles, distDir, distExists } from './support/dist.mjs';

const allowed = ['Use today, alpha', 'Use today', 'Experimental', 'Not open yet'];

test('Desk readiness splits Copilot CLI, tested daily, from Codex, still experimental', async () => {
  const { entry } = await import('../src/data/readiness.mjs');
  assert.deepEqual([entry('desk-copilot-cli').name, entry('desk-copilot-cli').label, entry('desk-copilot-cli').detail], ['Copilot CLI', 'Use today, alpha', 'Tested daily']);
  assert.deepEqual([entry('desk-codex').name, entry('desk-codex').label, entry('desk-codex').detail], ['Codex', 'Experimental', 'Runs, not yet proven in daily use']);
  assert.ok(!readiness.some((item) => item.name === 'Copilot CLI and Codex'));
});

test('readiness labels come only from the allowed four', () => {
  assert.deepEqual(Object.keys(allowedLabels).sort(), [...allowed].sort());
  for (const item of readiness) {
    assert.ok(allowed.includes(item.label), `${item.id} has label "${item.label}"`);
    for (const key of ['id', 'name', 'label', 'detail']) assert.equal(typeof item[key], 'string');
  }
});

test('the Desk page shows every host with an honest label', () => {
  const text = textOf(readDist('desk/index.html'));
  for (const [host, detail, label] of [
    // The three Claude Code hosts share the page's one "Use today, alpha" label.
    ['Claude Code', 'macOS: tested daily. Linux: listed, lightly tested. Windows: works, with rough edges.', ''],
    // Ari uses Copilot CLI every day as his primary harness, with Desk underneath (2026-10-11).
    ['Copilot CLI', 'Tested daily', 'Use today, alpha'],
    ['Codex', 'Runs, not yet proven in daily use', 'Experimental'],
    ['Hosted Desk on claude.ai', 'No sign-up yet', 'Not open yet'],
  ]) {
    const at = text.indexOf(host);
    assert.ok(at >= 0, `Desk page is missing ${host}`);
    const row = text.slice(at, at + 160);
    if (detail) assert.ok(row.includes(detail), `${host} should say "${detail}"`);
    if (label) assert.ok(row.includes(label), `${host} should be labelled "${label}"`);
  }
  assert.ok(text.includes('give your agent https://github.com/ourostack/desk/blob/main/SETUP.md and say "set this up"') ||
    text.includes('https://github.com/ourostack/desk/blob/main/SETUP.md set this up'), 'Desk page carries the setup line');
});

test('the Desk page keeps the plain-words line for screen readers only', () => {
  // Ari's ruling after pass 1: link the Desk RFC from the Desk page too (tested below).
  const html = readDist('desk/index.html');
  assert.match(html, /<span class="sr-only">In words: give your agent/);
});

test('hosted Desk has no sign-up form', () => {
  const html = readDist('desk/index.html');
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /<input\b[^>]*type="email"/i);
});

test('no page calls Desk, Ouro MD or Ouroboros stable, supported or production-ready', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const text = textOf(fs.readFileSync(file, 'utf8'));
    for (const match of text.matchAll(/\b(stable|supported|production-ready)\b/gi)) {
      const window = text.slice(Math.max(0, match.index - 80), match.index + match[0].length + 80);
      if (/Desk|Ouro MD|Ouroboros/.test(window)) offenders.push(`${path.relative(distDir, file)}: …${window}…`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the Ouro MD page carries the install line and the macOS floor', () => {
  const text = textOf(readDist('ouro-md/index.html'));
  assert.ok(text.includes('curl -fsSL https://ouro.bot/ouro-md-install.sh | bash'));
  assert.ok(text.includes('macOS 13'));
});

test('the Ouro MD page leads with the download and the agent-revision animation, with its playback speed', () => {
  const html = readDist('ouro-md/index.html');
  const imgs = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(([, src]) => src);
  assert.deepEqual(imgs, ['/brand/ouro-md-icon.png', '/images/workshop/ouro-md-reload-poster.png']);
  assert.match(html, /data-gif="\/images\/workshop\/ouro-md-reload\.gif"/);
  assert.ok(textOf(html).includes("A demo: an agent's revision lands in the plan I'm reading, and Ouro MD marks what changed. Sped up 3×."));
  assert.doesNotMatch(textOf(html), /One ordinary Markdown plan|the person stays in place/);
  assert.ok(!distExists('images/ouro-md'), 'The rejected Ouro MD media must not ship');
  assert.ok(html.indexOf('https://ouro.bot/apps/ouro-md/') < html.indexOf('ouro-md-install.sh'), 'The download comes before the terminal install');
  const text = textOf(html);
  assert.match(text, /you can turn it off in Settings/);
  assert.doesNotMatch(text, /principles 3 and 5/);
});

test('each tool page has exactly one way to report a problem through your agent', () => {
  // Desk: the support block is the only support line (no duplicate below it).
  const desk = textOf(readDist('desk/index.html')).replace(/\s+([.,])/g, '$1');
  assert.ok(desk.includes('Support goes through your agent'), 'Desk page is missing the support block');
  assert.ok(desk.includes('file a GitHub issue on ourostack/desk'), 'Desk support prompt must name the repository');
  assert.doesNotMatch(desk, /Found a problem\?/, 'Desk page repeats the support line');
  // Ouro MD: one plain line.
  const md = textOf(readDist('ouro-md/index.html')).replace(/\s+([.,])/g, '$1');
  assert.equal((md.match(/ask your agent to file an issue on github\.com\/ourostack\/ouro-md\./gi) || []).length, 1);
  assert.doesNotMatch(md, /Found a problem\?/);
});

test('the Desk page leads with what Desk does for a builder and links the RFC', () => {
  const html = readDist('desk/index.html');
  assert.ok(textOf(html).includes("My agents' work lives in a Git repository: tasks, decisions and lessons, so the next session picks up where the last one left off."));
  assert.ok(hrefsOf(html).includes('https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'));
});

test('the Desk page shows real session-start output, links the factory once, its label once, and limits in plain words', () => {
  const html = readDist('desk/index.html');
  const text = textOf(html);
  assert.ok(text.includes('Active tasks (1):'));
  assert.ok(text.includes('- my-app/checkout-flow "One-page checkout with saved addresses" (updated 2026-10-10)'));
  assert.equal(hrefsOf(html).filter((href) => href === 'https://ourostack.github.io/factory/').length, 1 + (hrefsOf(html.match(/<footer\b[\s\S]*?<\/footer>/)[0]).includes('https://ourostack.github.io/factory/') ? 1 : 0), 'The factory is linked once outside the footer');
  assert.match(text.replace(/\s+([.,])/g, '$1'), /The factory measures every session sent to it, in public\./);
  assert.doesNotMatch(text, /See what it does in practice/);
  // Once for the page (the Claude Code hosts) and once on the Copilot CLI row.
  assert.equal((text.match(/Use today, alpha/g) || []).length, 2, 'The alpha label shows for Claude Code and Copilot CLI');
  assert.ok(text.includes('macOS: tested daily. Linux: listed, lightly tested. Windows: works, with rough edges.'));
  assert.ok(text.includes("Desk's own browser starts signed out, and on macOS it can steal focus."));
  assert.doesNotMatch(text, /friction-to-fix|Its browser|fresh user profile/);
});

test('the Take the agent\'s seat essay no longer cites a checklist TTFA never had', () => {
  const text = textOf(readDist('blog/take-the-agents-seat/index.html'));
  assert.ok(text.includes('Communication without trust is the micromanagement TTFA already called out'));
  assert.doesNotMatch(text, /fourteen-step/);
});
