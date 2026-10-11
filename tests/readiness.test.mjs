import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readiness, allowedLabels } from '../src/data/readiness.mjs';
import { readDist, textOf, hrefsOf, listHtmlFiles, distDir, distExists } from './support/dist.mjs';

const allowed = ['Use today, alpha', 'Use today', 'Experimental', 'Not open yet'];

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
    ['Claude Code on macOS', 'Tested daily', 'Use today, alpha'],
    ['Claude Code on Linux', 'Listed, lightly tested', 'Use today, alpha'],
    ['Claude Code on Windows', 'Works, with rough edges', 'Use today, alpha'],
    ['Copilot CLI and Codex', 'Runs, not yet proven in daily use', 'Experimental'],
    ['Hosted Desk on claude.ai', 'No sign-up yet', 'Not open yet'],
  ]) {
    const at = text.indexOf(host);
    assert.ok(at >= 0, `Desk page is missing ${host}`);
    const row = text.slice(at, at + 160);
    if (detail) assert.ok(row.includes(detail), `${host} should say "${detail}"`);
    assert.ok(row.includes(label), `${host} should be labelled "${label}"`);
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

test('the Ouro MD page leads with the download and the media pack hero, light and dark', () => {
  const html = readDist('ouro-md/index.html');
  const imgs = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(([, src]) => src);
  assert.deepEqual(imgs, ['/brand/ouro-md-icon.png', '/images/workshop/ouro-md-harbor-light.webp', '/images/workshop/ouro-md-harbor-dark.webp']);
  for (const [img] of html.matchAll(/<img\b[^>]*ouro-md-harbor[^>]*>/g)) assert.match(img, /width="800" height="720"/);
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
