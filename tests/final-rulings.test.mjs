import assert from 'node:assert/strict';
import test from 'node:test';
import { readDist, textOf, listHtmlFiles } from './support/dist.mjs';
import { pageOg } from '../src/data/og.ts';
import fs from 'node:fs';

// The root's final rulings on the last critic pass and re-review (2026-10-11).
// Each test names its ruling. The playback (F2 to F4), llms.txt (F5), the
// readiness details (F12), /desk (F14), the homepage (F1, F13) and the Spoonjoy
// crop (F19) are tested beside the tests they changed.

const pageText = (file) => textOf(readDist(file).replace(/<nav\b[\s\S]*?<\/nav>/, '').replace(/<footer\b[\s\S]*?<\/footer>/, ''));

test('root final ruling F5: the /approach share card says "How I work"', () => {
  assert.equal(pageOg['/approach'].tag, 'How I work');
});

test('root final ruling F8: the blog index uses the story dek, an "Essays on agents" title, and "agent experience" in its lead', () => {
  const html = readDist('blog/index.html');
  assert.match(html, /<title>Essays on agents \| Ouroboros blog<\/title>/);
  const text = pageText('blog/index.html');
  assert.ok(text.includes('How a plugin for my OpenClaw agent turned into a harness I built from scratch.'), 'The origin-story card uses the /lab/story dek');
  assert.ok(pageText('lab/story/index.html').includes('How a plugin for my OpenClaw agent turned into a harness I built from scratch.'), 'The dek matches /lab/story');
  assert.ok(text.includes('Essays on agent experience, persistent agents, and the problem of building software an agent can actually stay oriented inside.'));
  assert.ok(!text.includes('and why the distinction matters'));
  assert.equal(textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), 'Dispatches from the serpent.', 'The H1 stays');
});

test('root final ruling F10: /lab says "a guided setup"', () => {
  const text = pageText('lab/index.html');
  assert.ok(text.includes('starts a guided setup'));
  assert.ok(!text.includes('starts a serpent guide'));
});

test('root final ruling F11: the tasks-and-work line says the scanner parses only task cards', () => {
  assert.ok(pageText('lab/docs/tasks-and-work/index.html').includes('is support material that the scanner may list for context, and it parses only task cards.'));
});

test('root final ruling F15: every video is named by its poster alt text', () => {
  let videos = 0;
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [video] of html.matchAll(/<video\b[^>]*>/g)) {
      videos++;
      assert.match(video, /\baria-label="[^"]{10,}"/, `${file}: a video has no aria-label`);
    }
  }
  assert.ok(videos > 0);
  const home = readDist('index.html');
  assert.match(home, /<video\b[^>]*aria-label="Captain Nemo sketches his periscope plans, and the page renders as fast as he types\."/);
  assert.match(home, /<video\b[^>]*aria-label="An agent logs the depth trials while the Captain reads along\."/);
});

test('root final ruling F17: /brief has no "No install" kicker, and the footer row has no separator to dangle', () => {
  const html = readDist('brief/index.html');
  assert.doesNotMatch(pageText('brief/index.html'), /No install/i);
  // Below 640px the row wraps, so the separators go and the gap separates the items.
  const css = fs.readFileSync(new URL('../src/components/Footer.astro', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 639\.98px\) \{ \.footer-sep \{ display: none; \}/);
  assert.match(html, /footer-sep/);
});

test('root final ruling F18: the AX essay says "the human" for the human side', () => {
  const text = pageText('blog/what-is-agent-experience/index.html');
  assert.ok(text.includes('UX taught us to care about how the product feels to the human using it.'));
  assert.ok(text.includes('DX taught us to care about how the system feels to the human building on it.'));
  assert.ok(!/the person (using|building)/.test(text));
});
