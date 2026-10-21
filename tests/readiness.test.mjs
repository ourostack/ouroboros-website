import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readiness, allowedLabels } from '../src/data/readiness.mjs';
import { readDist, textOf, hrefsOf, listHtmlFiles, distDir, distExists } from './support/dist.mjs';

const allowed = ['Alpha', 'Use today', 'Experimental', 'Not open yet', 'Under construction', 'Coming soon'];

test('Desk readiness splits Copilot CLI, tested daily, from Codex, still experimental', async () => {
  const { entry } = await import('../src/data/readiness.mjs');
  assert.deepEqual([entry('desk-copilot-cli').name, entry('desk-copilot-cli').label, entry('desk-copilot-cli').detail], ['GitHub Copilot CLI', 'Use today', 'Tested daily']); // root misses ruling 2.17; Desk + Crew handoff 2026-10-15: not branded alpha
  // root final ruling F12: readiness details have no trailing period.
  assert.deepEqual([entry('desk-codex').name, entry('desk-codex').label, entry('desk-codex').detail], ['Codex', 'Experimental', "Runs, and hasn't been proven in daily use yet"]);
  assert.ok(!readiness.some((item) => item.name === 'Copilot CLI and Codex'));
});

test('readiness labels come only from the approved vocabulary', () => {
  assert.deepEqual(Object.keys(allowedLabels).sort(), [...allowed].sort());
  for (const item of readiness) {
    assert.ok(allowed.includes(item.label), `${item.id} has label "${item.label}"`);
    for (const key of ['id', 'name', 'label', 'detail']) assert.equal(typeof item[key], 'string');
  }
});

test('the Desk page shows every host with an honest label', () => {
  const page = textOf(readDist('desk/index.html'));
  // The rows live under "Where it runs"; the playback above it names harnesses too.
  const text = page.slice(page.indexOf('Where it runs'));
  for (const [host, detail, label] of [
    // The three Claude Code hosts share one row, and it carries the badge (copy deck round 2).
    // Desk + Crew handoff (2026-10-15): core Desk is opt-in, not branded alpha; each host keeps its evidence.
    ['Claude Code', 'macOS: tested daily. Linux and Windows: the full test suite runs on both in CI', 'Use today'],
    // Ari uses Copilot CLI every day as his primary harness, with Desk underneath (2026-10-11).
    ['Copilot CLI', 'Tested daily', 'Use today'],
    ['Codex', "Runs, and hasn't been proven in daily use yet", 'Experimental'],
    ['Hosted Desk on claude.ai', 'Sign-in by invitation', 'Not open yet'],
  ]) {
    const at = text.indexOf(host);
    assert.ok(at >= 0, `Desk page is missing ${host}`);
    const row = text.slice(at, at + 160);
    if (detail) assert.ok(row.includes(detail), `${host} should say "${detail}"`);
    if (label) assert.ok(row.includes(label), `${host} should be labelled "${label}"`);
  }
  assert.ok(page.includes('give your agent https://github.com/ourostack/desk/blob/main/SETUP.md and say "set this up"') ||
    page.includes('https://github.com/ourostack/desk/blob/main/SETUP.md set this up'), 'Desk page carries the setup line');
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

test('the Ouro MD page leads with the card copy and the stacked clips, with no second demo and no badge', () => {
  const html = readDist('ouro-md/index.html');
  // Copy deck (2026-10-11): /ouro-md/ leads with the homepage card's copy and the same media.
  assert.ok(textOf(html).includes('My agents write their plans and reports in Markdown. Ouro MD is a Mac editor made for reading them: it renders as you type, and marks exactly what changed when an agent edits.'));
  const content = html.replace(/<nav\b[\s\S]*?<\/nav>/, '');
  const imgs = [...content.matchAll(/<(?:img\b[^>]*src|video\b[^>]*poster)="([^"]+)"/g)].map(([, src]) => src);
  assert.deepEqual(imgs, ['/brand/ouro-md-icon.png', '/images/workshop/ouro-md-typing-light-poster.png', '/images/workshop/ouro-md-typing-dark-poster.png', '/images/workshop/ouro-md-agent-edit-light-poster.png', '/images/workshop/ouro-md-agent-edit-dark-poster.png']);
  // Copy deck round 2: the hero clips stack one per row, the second demo ("Harbor launch plan") and its GIF are cut, and there is no badge.
  assert.match(html, /class="clip-pair clip-stack"/);
  assert.doesNotMatch(html, /ouro-md-reload|data-gif=/);
  assert.doesNotMatch(textOf(html), /A demo: an agent's revision lands|Use today/);
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

test('the Desk page leads with the card copy and the playback, and links the RFC', () => {
  const html = readDist('desk/index.html');
  // Copy deck (2026-10-11): /desk/ leads with the homepage card's copy and the same media.
  assert.ok(textOf(html).includes(`Desk keeps my agents' work in a Git repository: every track, task, decision, and lesson. I can open any harness on any of my machines, ask "where were we?", and the agent knows.`));
  assert.ok(textOf(html).replace(/\s+([.,])/g, '$1').includes("The full design is in Desk's design doc."));
  assert.match(html, /<meta name="description" content="[^"]*a job is done when you’ve seen it work\./);
  assert.match(html, /data-desk-playback/);
  assert.ok(html.indexOf('data-desk-playback') < html.indexOf('Where it runs'), 'The playback leads the right column');
  assert.match(html, /<meta name="description" content="[^"]*For Claude Code and GitHub Copilot CLI, with Crew for teams\."/);
  assert.doesNotMatch(html, /An alpha for/);
  assert.ok(hrefsOf(html).includes('https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'));
});

test('the Desk page shows real session-start output, links the factory once, its label once, and limits in plain words', () => {
  const html = readDist('desk/index.html');
  const text = textOf(html);
  assert.ok(text.includes('Active tasks (4):'));
  assert.ok(text.includes('- spoonjoy/recipe-import "Import recipes from any webpage" (updated 2026-10-10)'));
  assert.equal(hrefsOf(html).filter((href) => href === 'https://ourostack.github.io/factory/').length, 1 + (hrefsOf(html.match(/<footer\b[\s\S]*?<\/footer>/)[0]).includes('https://ourostack.github.io/factory/') ? 1 : 0), 'The factory is linked once outside the footer');
  assert.ok(text.replace(/\s+([.,])/g, '$1').includes("Setup also installs Superpowers, Jesse Vincent's skill set for coding agents. Desk asks once whether you'd like to send your sessions' timings to the public factory. It sends timings and sizes, and never transcript text, prompts, file contents, or names."));
  // root misses ruling 3.5: the Desk page points at the principles it encodes.
  assert.ok(text.replace(/\s+([.,])/g, '$1').includes('Every job starts with one conversation and a go, and ends with evidence you accept or send back, the way How I work lays it out.'));
  // root final ruling F14: the H2 matches the session-start output under it.
  assert.ok(text.includes('What a new session looks like'), 'The sample terminal sits under its own heading');
  // The page reads top to bottom with no boxes (2026-10-20): Known limits is its own section right after Where it runs.
  assert.ok(html.indexOf('Where it runs') < html.indexOf('Known limits today') && html.indexOf('Known limits today') < html.indexOf('What a new session looks like'), 'Known limits follows Where it runs');
  assert.doesNotMatch(html, /rounded-2xl border border-canopy\/40 bg-deep\/70/, 'No boxed cards on the Desk page');
  assert.doesNotMatch(text, /See what it does in practice/);
  // Once for the page, once on the Claude Code row and once on the Copilot CLI row; Desk itself is never branded alpha.
  assert.equal((text.match(/\bUse today\b/g) || []).length, 3, 'The Use today label shows for the page, Claude Code and Copilot CLI');
  assert.doesNotMatch(text, /\bAlpha\b/);
  assert.doesNotMatch(text, /Use today, alpha/);
  assert.ok(text.includes('macOS: tested daily. Linux and Windows: the full test suite runs on both in CI'));
  assert.ok(text.includes("We haven't yet tested a first install on a brand-new Mac account."));
  assert.ok(text.includes("Desk's own browser starts signed out, and on macOS it can steal focus."));
  assert.doesNotMatch(text, /friction-to-fix|Its browser|fresh user profile/);
});

test('the Take the agent\'s seat essay no longer cites a checklist TTFA never had', () => {
  const text = textOf(readDist('blog/take-the-agents-seat/index.html'));
  assert.ok(text.includes("Trust the Fucking Agent was about trust. This one's about saying what you mean."));
  assert.doesNotMatch(text, /fourteen-step/);
});
