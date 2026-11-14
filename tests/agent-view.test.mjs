import assert from 'node:assert/strict';
import test from 'node:test';
import { readDist, textOf, decode } from './support/dist.mjs';
import { pageMarkdown } from '../src/lib/page-markdown.mjs';

// The home page's Agent view (Ari, 2026-11-14: "i want folks to think 'whoa i
// can really trust that ari is the best at working with agents'"): one switch
// shows the page as an agent reads it, /index.md, written from the page's own
// HTML at build so the two can't drift. scripts/agent-view.mjs checks the
// switch in a browser.

const html = readDist('index.html');
const md = readDist('index.md');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<section id="agent-view"[\s\S]*?<\/section>/, '');

test('index.md is the home page itself, written from its built HTML', () => {
  assert.equal(md, pageMarkdown(html, '/'), 'the twin is exactly what the built page converts to');
  assert.match(md, /^---\ntitle: "How can humans and agents do more together\? \| Ouro"\ndescription: "[^"]+"\nurl: https:\/\/ouroboros\.bot\/\n---\n\n# How can humans and agents do more together\?\n/);
  for (const [, level, inner] of main.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const words = textOf(inner).replace(/\s+/g, ' ').trim();
    assert.ok(md.split('\n').some((line) => line.trim() === `${'#'.repeat(Number(level))} ${words}`), `index.md is missing the heading "${words}"`);
  }
});

test('index.md gives each picture once, as its description, and every link in full', () => {
  const [, src, hero] = main.match(/<picture data-scheme="light"[\s\S]*?<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]+)"/);
  const night = main.match(/<picture data-scheme="dark"[\s\S]*?alt="([^"]+)"/)[1];
  assert.ok(md.includes(`![${decode(hero)}](https://ouroboros.bot${src})`), 'the hero is its description, by day');
  assert.ok(!md.includes(decode(night)), 'the night twin of a picture is left out');
  assert.doesNotMatch(md, /!\[\]\(/, 'a decorative picture says nothing');
  assert.doesNotMatch(md, /\]\((?!https?:)/, 'every link is absolute');
  assert.doesNotMatch(md, /\]\([^)\s]*\\/, 'no Markdown escapes inside an address');
  assert.doesNotMatch(md, /<(img|picture|source|span|div)\b|\u00A0/);
  assert.ok(!md.includes('as an agent reads it'), 'the Agent view itself is not part of the page');
});

test('pageMarkdown keeps what an agent can use and leaves out what it can not', () => {
  const out = pageMarkdown(`<html><head><title>T | Ouro</title><meta name="description" content="D"><link rel="canonical" href="https://ouroboros.bot/x/"></head><body><nav>Primary nav</nav><main>
    <h1>Hi</h1>
    <p><span>Act 1</span><strong>Capability.</strong>Getting</p>
    <picture data-scheme="light"><img src="/day.webp" alt="By day"></picture><picture data-scheme="dark"><img src="/night.webp" alt="By night"></picture>
    <p><img src="/deco.svg" alt=""><span aria-hidden="true">glyph</span><span hidden>later</span><button>Pause</button><a href="/desk/"> Desk </a></p>
    <video aria-label="A clip"><source src="/c.webm" type="video/webm"><source src="/c.mp4" type="video/mp4"></video>
  </main></body></html>`, '/x/');
  assert.match(out, /^---\ntitle: "T \| Ouro"\ndescription: "D"\nurl: https:\/\/ouroboros\.bot\/x\/\n---\n\n# Hi\n/);
  assert.ok(out.includes('Act 1 **Capability.** Getting'), 'pieces set as blocks keep a space between them');
  assert.ok(out.includes('![By day](https://ouroboros.bot/day.webp)'));
  assert.ok(out.includes('[Desk](https://ouroboros.bot/desk/)'));
  assert.ok(out.includes('[Video: A clip](https://ouroboros.bot/c.mp4)'));
  for (const gone of ['Primary nav', 'By night', 'deco', 'glyph', 'later', 'Pause']) assert.ok(!out.includes(gone), `"${gone}" should be left out`);
});

test('the home page offers its twin to agents and a switch to people', () => {
  assert.match(html, /<link rel="alternate" type="text\/markdown" href="\/index\.md"/);
  const nav = html.slice(html.indexOf('id="main-nav"'), html.indexOf('id="mobile-menu"'));
  assert.match(nav, /<astro-island\b[^>]*component-url="[^"]*AgentViewSwitch[^"]*"[\s\S]*?role="switch"[\s\S]*?>Agent view</, 'the nav holds the Agent view switch');
  assert.match(nav, /<a class="agent-view-fallback"[^>]*href="\/index\.md"[^>]*>Agent view<\/a>/, 'without scripts, a link to the same file');
  assert.match(nav, /role="status"[^>]*data-agent-view-status/);
  assert.match(html, /<section id="agent-view"[^>]*data-src="\/index\.md"[^>]*hidden/);
  assert.ok(readDist('llms.txt').includes('(https://ouroboros.bot/index.md)'));
  assert.match(readDist('_headers'), /\/\*\.md\n\s+Content-Type: text\/markdown; charset=utf-8/);
});
