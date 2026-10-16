import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readDist, textOf, hrefsOf, distExists, listHtmlFiles, distDir, loadDenyList } from './support/dist.mjs';

// Copy deck round 2 (2026-10-11): "Story" leaves the nav, and "Try it" joins it.
const navLinks = [
  ['How I work', '/approach/'],
  ['Desk', '/desk/'],
  ['Ouro MD', '/ouro-md/'],
  ['Lab', '/lab/'],
  ['Blog', '/blog/'],
  ['Try it', '/#try'],
];

function navOf(html) {
  const match = html.match(/<nav\b[^>]*id="main-nav"[\s\S]*?<\/nav>/);
  assert.ok(match, 'Missing main nav');
  return match[0];
}

function footerOf(html) {
  const match = html.match(/<footer\b[\s\S]*?<\/footer>/);
  assert.ok(match, 'Missing footer');
  return match[0];
}

const plain = (html) => textOf(html).replace(/\s+([,.;:])/g, '$1').replace(/\s+/g, ' ');

// ── The homepage, verbatim from the copy deck (2026-10-11) ──

const homeText = () => plain(readDist('index.html')).replace(/\s+([,.;:?!)])/g, '$1').replace(/\(\s+/g, '(');
const assertLines = (text, lines, where = 'Homepage') => {
  for (const line of lines) assert.ok(text.includes(line), `${where} is missing "${line}"`);
};

test('homepage head and hero follow the deck, with a small portrait linking to mendelow.me', () => {
  const html = readDist('index.html');
  // root misses ruling 2.13: one title suffix site-wide.
  // Ari, 2026-10-16: the suffix is the brand, Ouro; the h1 asks the question his work answers.
  assert.match(html, /<title>How can humans and agents do more together\? \| Ouro<\/title>/);
  const description = "Hello!! I'm Ari, and that question is behind everything I build. This is my workshop: the tools I've built for working with agents, how I use them, and where it all started.";
  assert.ok(html.includes(`<meta name="description" content="${description.replace(/'/g, '&#39;')}"`) || html.includes(`<meta name="description" content="${description}"`), 'Meta description');
  const h1 = textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
  assert.equal(h1, 'How can humans and agents do more together?');
  const text = homeText();
  assert.ok(text.includes(description));
  assert.match(html, /<a href="https:\/\/mendelow\.me" class="hero-pic[^"]*"[^>]*>\s*<img src="\/images\/workshop\/ari-portrait\.jpg"[^>]*width="600" height="824"/);
  // root misses ruling 2.6: the sister site is off-site, so it takes ↗, as in the nav.
  assert.ok(text.includes('More about me ↗'));
  // root misses ruling 2.14: the portrait alt matches mendelow.me.
  assert.match(html, /alt="Ari Mendelow, smiling, in a navy blazer on a grassy overlook above a river gorge\." class="portrait-img"/);
  assert.ok(distExists('images/workshop/ari-portrait.jpg'), 'The portrait is copied locally, never hotlinked');
  assert.doesNotMatch(html, /src="https?:\/\//, 'No hotlinked images');
  const css = fs.readdirSync(path.join(distDir, '_astro')).filter((n) => n.endsWith('.css')).map((n) => fs.readFileSync(path.join(distDir, '_astro', n), 'utf8')).join('\n') + html;
  assert.match(css, /\.portrait(\[[^\]]+\])?\{[^}]*width:6\.5rem/);
  assert.doesNotMatch(html, /ouroboros-spin/, 'The ring lives on /lab/ only');
  assert.doesNotMatch(text, /People keep ending up as the glue/);
});

test('homepage shows eight things I\'ve built, each with captioned media and its links', () => {
  const html = readDist('index.html');
  const text = homeText();
  assertLines(text, [
    "Things I've built",
    'Tools I made for working with agents, and one product I rebuilt with them.',
    // root misses rulings 5.1, 5.2, 5.3, 5.5, 5.7, and 2.8.
    "Professor Aronnax drafts the periscope plans, and every table and chart renders as he writes.",
    'Back from the deep, an agent logs the depth trials, and a bar in the margin marks what changed.',
    'A Markdown editor for the Mac that renders as you type. My agents write their plans, reports, and docs in Markdown, and Ouro MD is made for reading them, leaving notes for them, and seeing exactly what changed when they edit.',
    'Dramatization Ned Land plans the periscope overhaul in Claude Code. At dawn, Conseil asks Copilot CLI where they were, and it knows.',
    `Desk keeps my agents' work in a Git repository: every track, task, decision, and lesson. I can open any harness on any of my machines, ask "where were we?", and the agent knows.`,
    "A heart, a mind, nerves, and senses: the real source folders, named so the agent can find its way around its own body.",
    "This is the agent harness I built from scratch, and it's where I test what agents need. It gives a personal agent an identity, memory that lasts, real tools, and the channels I already use. Building it, I watched closely how my agent used what I gave it. Did it pick the right tool and finish the job without getting confused? When it didn't, I asked it why and changed the design. That habit is what I call Agent Experience.",
    'My mushroom risotto in Spoonjoy, one tap from cook mode.',
    "My recipe app. I've rebuilt it every time I learned a new way to build software. The easy things, like finding a recipe and cooking from it, stay in the app. Anything complicated, like importing a recipe from a messy webpage, goes to an agent that works through the same operations the app uses. For everything in between, I believe the app will eventually draw its own UI.",
    'Ouro MD →', 'Desk →', 'The harness →', 'What is Agent Experience? →', 'Spoonjoy, from the start ↗', 'spoonjoy.app ↗',
  ]);
  for (const href of ['/ouro-md/', '/desk/', '/lab/', '/blog/what-is-agent-experience/', 'https://mendelow.me/#spoonjoy-story', 'https://spoonjoy.app', 'https://github.com/ourostack/m365crawl']) assert.ok(hrefsOf(html).includes(href), `Missing ${href}`);

  // Copy deck round 2: the m365crawl card comes fourth, before Spoonjoy.
  assertLines(text, [
    'The doctor, giving an archive its checkup.',
    'It gives my agent one local, searchable archive of my Teams chats, Outlook mail, and meetings, read from what my signed-in apps already cached. My agent can find the conversation and walk into the meeting prepared, without me pasting a thing.',
    'm365crawl on GitHub ↗',
  ]);
  const cards = [...html.matchAll(/<article class="product[^"]*" id="([^"]+)"/g)].map(([, id]) => id);
  // Product pass (Ari, 2026-10-15): every product gets its section. Shepherd and Friends join;
  // m365crawl drops to a half-width card beside Friends, and Spoonjoy closes the list.
  assert.deepEqual(cards, ['ouroboros', 'desk', 'ouro-md', 'ouro-ui', 'shepherd', 'friends', 'm365crawl', 'spoonjoy']);
  assert.match(html, /<article class="product" id="m365crawl"/);
  assertLines(text, [
    'What an answer could look like in the terminal. Illustration, not real output.',
    'Ouro Shepherd Coming soon',
    "We're using and refining Shepherd on our own machines ahead of wider availability.",
    'How Shepherd decides ↗',
    'One person, every channel, one place on the trust ladder, and other agents who know him. Illustration, not real data.',
    'Friends Alpha',
    'Friends ↗', 'Friends Relay ↗',
  ]);
  for (const href of ['https://github.com/ourostack/ouroboros/blob/main/docs/shepherd-sense.md', 'https://github.com/ourostack/friends', 'https://github.com/ourostack/friends-relay']) assert.ok(hrefsOf(html).includes(href), `Missing ${href}`);
  // Shepherd is a coming-soon preview: no install, download or date.
  const shepherd = html.match(/<article\b[^>]*id="shepherd"[\s\S]*?<\/article>/)[0];
  assert.doesNotMatch(textOf(shepherd), /install|download|available now|\b20\d\d\b/i);
  const outside = html.replace(/<article\b[^>]*id="m365crawl"[\s\S]*?<\/article>/, '');
  assert.doesNotMatch(outside, /Microsoft 365/, 'Microsoft 365 is named only in the m365crawl card');
  assert.equal((html.match(/<span class="tag tag-plain"[^>]*>Dramatization<\/span>/g) || []).length, 2, 'Ouro MD and Desk are labelled Dramatization');

  // Removed in this pass: the Spoonjoy screenshot, the serpent preview, the factory numbers and the proposed principle.
  assert.doesNotMatch(html, /spoonjoy-app\.jpg|serpent-preview|desk-boot\b/);
  assert.doesNotMatch(text, /One agent session ran for|\(proposed\)|Fix the system/);

  // Media slots: every clip ships with its poster. A placeholder never ships (design.md).
  // The Ouro MD clips come in a light and a dark recording, each with its own poster.
  const slots = ['ouro-md-typing', 'ouro-md-agent-edit'].flatMap((clip) => ['light', 'dark'].map((theme) => ({ name: `${clip}-${theme}`, poster: `${clip}-${theme}-poster` })));
  for (const { name, poster } of slots) {
    assert.ok(distExists(`images/workshop/${poster}.png`), `${poster}.png poster ships`);
    assert.ok(distExists(`images/workshop/${name}.mp4`), `${name}.mp4 ships`);
    {
      const video = html.match(new RegExp(`<video\\b[^>]*poster="/images/workshop/${poster}\\.png"[^>]*>`));
      assert.ok(video, `${name} renders as a video with its poster`);
      assert.match(video[0], /\bmuted\b/);
      assert.match(video[0], /preload="none"/);
      assert.doesNotMatch(video[0], /\bautoplay\b/, 'Clips play from script so reduced motion keeps the poster');
      // WCAG 2.2.2: a looping clip has a visible Pause/Play control next to it.
      const clip = html.match(new RegExp(`<div class="workshop-clip"[^>]*>\\s*<video\\b[^>]*poster="/images/workshop/${poster}\\.png"[\\s\\S]*?</div>`));
      assert.ok(clip, `${name} sits in a clip wrapper`);
      assert.match(clip[0], /<button type="button" class="clip-toggle"[^>]*data-clip-toggle[^>]*>Pause<\/button>/, `${name} has a Pause control`);
    }
  }
  // The Ouro MD clips are the real 840x630 recordings, WebM first, and CSS shows the
  // one for the active theme, so the poster matches the theme without JS.
  for (const clip of ['ouro-md-typing', 'ouro-md-agent-edit']) {
    for (const theme of ['light', 'dark']) {
      assert.ok(distExists(`images/workshop/${clip}-${theme}.mp4`) && distExists(`images/workshop/${clip}-${theme}.webm`), `${clip}-${theme} ships as MP4 and WebM`);
      const wrapped = html.match(new RegExp(`<div class="clip-theme theme-${theme}-only"[^>]*>\\s*<div class="workshop-clip"[^>]*>\\s*<video\\b[^>]*poster="/images/workshop/${clip}-${theme}-poster\\.png"[^>]*>\\s*<source src="/images/workshop/${clip}-${theme}\\.webm" type="video/webm"[^>]*>\\s*<source src="/images/workshop/${clip}-${theme}\\.mp4" type="video/mp4"`));
      assert.ok(wrapped, `${clip}-${theme} sits in its theme wrapper with WebM before MP4`);
      assert.match(wrapped[0], /width="840" height="630"/);
    }
  }
  assert.doesNotMatch(html, /ouro-md-type\.png|ouro-md-agent-edit\.png/, 'The Ouro MD placeholder posters are gone');
});

test('no page ships a "Recording in progress" placeholder or a poster with no clip', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(distDir, file);
    if (/Recording in progress/i.test(html)) offenders.push(`${rel}: "Recording in progress"`);
    // WorkshopVideo renders a bare poster when its clip file is missing; that is a placeholder too.
    if (/data-clip-pending=/.test(html)) offenders.push(`${rel}: a poster with no clip`);
  }
  assert.deepEqual(offenders, []);
  // The rejected Spoonjoy import recording never ships (root ruling, 2026-10-11).
  for (const ext of ['mp4', 'webm', 'png']) assert.ok(!distExists(`images/workshop/spoonjoy-import.${ext}`), `spoonjoy-import.${ext} must not ship`);
});

test('the Spoonjoy card shows one of Ari\'s own recipes, linked, with the deck caption', () => {
  const html = readDist('index.html');
  const card = html.match(/<article\b[^>]*id="spoonjoy"[\s\S]*?<\/article>/);
  assert.ok(card, 'Missing the Spoonjoy card');
  const img = card[0].match(/<img\b[^>]*src="\/images\/workshop\/spoonjoy-recipe\.(?:webp|jpg)"[^>]*>/);
  assert.ok(img, 'The Spoonjoy card shows the recipe screenshot');
  // root final ruling F19: cropped to the recipe hero, without the blank bottom and the COOK MODE rule.
  assert.match(img[0], /width="1440" height="1200"/);
  const webp = fs.readFileSync(new URL('../public/images/workshop/spoonjoy-recipe.webp', import.meta.url));
  assert.equal(webp.toString('ascii', 12, 16), 'VP8 ', 'A lossy WebP');
  assert.deepEqual([webp.readUInt16LE(26) & 0x3fff, webp.readUInt16LE(28) & 0x3fff], [1440, 1200], 'The file matches its width and height');
  assert.match(img[0], /loading="lazy"/);
  assert.match(img[0], /alt="Ari(&#39;|')s Mushroom Risotto recipe page on Spoonjoy: three bowls of risotto topped with parmesan and green onion\."/);
  assert.ok(hrefsOf(card[0]).includes('https://spoonjoy.app/recipes/cmq35k4c10001zn0npvsmw05z'), 'The screenshot links to the recipe');
  assert.ok(plain(card[0]).includes('My mushroom risotto in Spoonjoy, one tap from cook mode.'));
  // root misses ruling 3.14: the operations link to their source, as on mendelow.me.
  assert.ok(hrefsOf(card[0]).includes('https://github.com/spoonjoy/spoonjoy-v2/blob/main/app/lib/spoonjoy-api.server.ts'));
  assert.doesNotMatch(plain(card[0]), /Real, sped up|imports a recipe/);
});

test('the m365crawl card shows the repo\'s doctor screenshot at its real size', () => {
  const html = readDist('index.html');
  const card = html.match(/<article\b[^>]*id="m365crawl"[\s\S]*?<\/article>/)[0];
  assert.match(card, /<img src="\/images\/workshop\/m365crawl-doctor\.png" width="\d+" height="\d+" loading="lazy"/);
  assert.ok(distExists('images/workshop/m365crawl-doctor.png'));
  assert.ok(!distExists('images/workshop/m365crawl-indexed-notes.png'), 'The synthetic indexed-notes screenshot no longer ships');
  assert.ok(plain(card).includes('The doctor, giving an archive its checkup.'));
});

test('homepage Desk playback renders its final frame without JS, shows scene 1 as a still before it plays, and plays once with a replay', () => {
  const html = readDist('index.html');
  const playback = html.match(/<div\b[^>]*data-desk-playback[\s\S]*?<\/pre>\s*<\/div>\s*<\/div>/);
  assert.ok(playback, 'Missing the Desk playback');
  const scenes = [...playback[0].matchAll(/<pre\b([^>]*)data-scene="([^"]+)"([^>]*)>([\s\S]*?)<\/pre>/g)];
  assert.equal(scenes.length, 2);
  assert.match(scenes[0][1] + scenes[0][3], /\bdata-off\b/, 'Scene 1 is hidden in the final frame');
  assert.doesNotMatch(scenes[1][1] + scenes[1][3], /\b(hidden|data-off)\b/, 'The final frame is visible without JS');
  assert.match(playback[0], /^<div\b[^>]*role="group"[^>]*aria-label="Desk playback"/);
  const plainText = (h) => textOf(h).replace(/\s+([,.?])/g, '$1');
  // The wide frame: the narrow-only lines left out (root final ruling F4).
  const lineSpan = (attr) => new RegExp(`<span class="dp-line[^"]*"[^>]*\\b${attr}\\b[^>]*>[^<]*<\\/span>`, 'g');
  const one = plainText(scenes[0][4].replace(lineSpan('data-narrow'), ''));
  const two = plainText(scenes[1][4].replace(lineSpan('data-narrow'), ''));
  // Copy deck round 2: scene 1 answers only the periscope request.
  assert.equal(one, "Desk boot: ok | host laptop / ned / claude > Plan the periscope overhaul ⏺ task_create periscope/overhaul ⎿ Next step: survey the lens, the seals, and the hoist ⏺ Filed under periscope. I'll start with the lens survey tomorrow.");
  assert.match(playback[0], /data-scene-title="ned"[^>]*>ned@laptop · Claude Code</);
  assert.match(playback[0], /data-scene-title="conseil"[^>]*>conseil@mac2 · Copilot CLI · next morning</);
  assert.ok(two.startsWith('> where were we?'), 'Scene 2 starts with the prompt');
  for (const line of ['- periscope/overhaul', '- ballast/pump-3', 'blocker: waiting on parts at Vanikoro', '- salon/organ-tuning', '- captains-log/export', "waiting on Captain Nemo's review", 'processing (2)', 'validating (1)', 'next: survey the lens, the seals, and the hoist']) {
    assert.ok(two.includes(line), `Scene 2 is missing "${line}"`);
  }
  assert.ok(two.endsWith('We were on the periscope overhaul. Ned planned it last night, and the next step is surveying the lens, the seals, and the hoist. The ballast pump is still waiting on parts. Want me to start on the periscope?'), 'Scene 2 ends with the agent\'s plain line');
  // The still before it plays: the boot line and the prompt are the opening lines, so the body is never empty.
  const opening = [...scenes[0][4].matchAll(/<span class="dp-line[^"]*" data-opening([^>]*)>([\s\S]*?)<\/span>/g)].filter(([, attrs]) => !/data-narrow/.test(attrs)).map(([, , inner]) => textOf(inner));
  assert.deepEqual(opening, ['Desk boot: ok | host laptop / ned / claude', '> Plan the periscope overhaul']);
  // root misses ruling 8.5: a phone shows a shorter host, so the boot line never wraps.
  assert.match(scenes[0][4], /<span class="dp-line[^"]*" data-opening data-narrow[^>]*>Desk boot: ok \| host laptop\/ned<\/span>/);
  assert.match(playback[0], /<button\b[^>]*data-replay[^>]*hidden/, 'Replay appears only once the script runs');
  assert.match(html, /Replay<\/button>/);
  assert.match(playback[0], /<button\b[^>]*data-skip[^>]*hidden[^>]*>Skip<\/button>/, 'Skip shows only while it plays');
  assert.match(html, /prefers-reduced-motion: reduce/);
  // Armed only by the module, so a failed load leaves the final frame; a click, Skip, or Enter, Space or Escape skips to the end.
  assert.doesNotMatch(html, /Arm the playback before first paint/);
  const moduleSrc = fs.readFileSync(new URL('../src/components/DeskPlayback.astro', import.meta.url), 'utf8');
  assert.match(moduleSrc, /<script>[\s\S]*hasAttribute\('data-opening'\)[\s\S]*still\(\)\s*root\.setAttribute\('data-armed', ''\)/);
  assert.match(moduleSrc, /skipButton\.hidden = false/);
  assert.match(html, /\["Enter"," ","Escape"\]/);
  // Scene 1 holds for at least 5 seconds. Both scenes share one grid cell and unshown lines keep their space, so the box holds the final frame's height and nothing pins it taller.
  assert.match(moduleSrc, /\.dp-body \{ grid-area: 1 \/ 1; \}/);
  assert.match(moduleSrc, /\.dp-line\[data-off\] \{ visibility: hidden; \}/);
  assert.match(html, /await \w+\(5[0-9]{3}\)/, "Scene 1 holds for at least 5 seconds");
  assert.doesNotMatch(html, /minHeight/);
  // root final ruling F2: when Skip or Replay hides itself while focused, focus moves to the button that replaces it.
  assert.match(moduleSrc, /const finish = \(\) => \{\s*const hadFocus = root\.contains\(document\.activeElement\)[\s\S]*?if \(hadFocus\) replay\.focus\(\)/);
  assert.match(moduleSrc, /const hadFocus = document\.activeElement === replay\s*replay\.hidden = true\s*skipButton\.hidden = false\s*if \(hadFocus\) skipButton\.focus\(\)/);
  // root final ruling F3: the host bar wraps its title and never truncates it; titles and buttons each share a cell, so the bar keeps one height.
  assert.doesNotMatch(moduleSrc, /text-overflow: ellipsis/);
  assert.match(moduleSrc, /\.dp-title \{ grid-area: 1 \/ 1;/);
  assert.match(moduleSrc, /\.dp-actions > \.dp-replay \{ grid-area: 1 \/ 1; justify-self: end; \}/);
  assert.match(moduleSrc, /\.dp-title\[data-off\], \.dp-sizer \{ visibility: hidden; \}/);
  assert.match(playback[0], /<span class="dp-replay dp-sizer"[^>]*aria-hidden="true"[^>]*>Replay<\/span>/, 'An invisible Replay holds the buttons\' width');
  // root final ruling F4: below 640px, scene 2 drops the blocked group's explanation and the salon task, and the counts follow.
  assert.match(moduleSrc, /@media \(max-width: 639\.98px\) \{ \.dp-line\[data-wide\] \{ display: none; \} \}/);
  assert.match(moduleSrc, /@media \(min-width: 640px\) \{ \.dp-body \{ font-size: 0\.75rem; \} \.dp-line\[data-narrow\] \{ display: none; \} \}/);
  const linesWith = (attr) => [...scenes[1][4].matchAll(lineSpan(attr))].map(([span]) => textOf(span).trim());
  // root misses ruling 8.5: the boot line has a shorter host on a phone.
  assert.deepEqual(linesWith('data-wide'), ['Desk boot: ok | host mac2 / conseil / copilot', 'Active tasks (4):', 'BLOCKED (1): these cannot move until the blocker clears', 'processing (2)', '- salon/organ-tuning', 'next: tune the reeds, pipes, and pedals']);
  assert.deepEqual(linesWith('data-narrow'), ['Desk boot: ok | host mac2/conseil', 'Active tasks (3):', 'BLOCKED (1)', 'processing (1)']);
  const narrow = plainText(scenes[1][4].replace(lineSpan('data-wide'), ''));
  assert.ok(!narrow.includes('salon') && !narrow.includes('these cannot move'), 'The narrow frame drops the salon task and the blocked explanation');
});

test('homepage Ouroboros card shows the real body-part folders of the harness source', () => {
  const html = readDist('index.html');
  const tree = html.match(/<div\b[^>]*class="source-tree[^"]*"[^>]*data-source-sha="([0-9a-f]{40})"[\s\S]*?<\/pre>/);
  assert.ok(tree, 'Missing the source tree with its commit');
  const text = textOf(tree[0]);
  for (const dir of ['heart/', 'mind/', 'nerves/', 'repertoire/', 'senses/']) assert.ok(text.includes(dir), `Tree is missing ${dir}`);
  assert.match(tree[0], /└── <\/span><span class="st-more"[^>]*>…<\/span>/, 'A last "…" row says src/ holds more');
});

test('homepage says how Ari works, in three acts, three smells and five principles', () => {
  const html = readDist('index.html');
  const text = homeText();
  assertLines(text, [
    'How I work',
    'I see this agentic era in three acts:',
    "Capability. Getting an agent to do anything you can do on a computer. That's been solved for a while.",
    // root misses rulings 3.1, 2.15, and 3.2: the acts link Desk and the factory.
    "Orientation. Keeping an agent clear on who it is, who it's working with, and what the work is, from one session to the next. Most of what I've built is about this, starting with Desk.",
    "Work design. Designing and measuring how agents get their work done. The industry is just starting to move into this one, and it's what the factory is for.",
    "When something's off",
    "You're doing it by hand. Anything the agent could have done.",
    "You're teaching it twice. The same correction, session after session.",
    "Control keeps coming back to you. You've become an approval button on a loop.",
    "What's been working",
    // root misses rulings 4.2 and 3.3.
    "Two more things I keep coming back to: if an agent did something you didn't expect, you didn't prompt it effectively, and when you improve something, apply it to the whole system, so the next agent starts out ahead.",
    'Fix it for the next agent →',
  ]);
  const method = html.match(/<section\b[^>]*aria-labelledby="method-heading"[\s\S]*?<\/section>/)[0];
  assert.ok(hrefsOf(method).includes('/desk/') && hrefsOf(method).includes('#factory') && hrefsOf(method).includes('/approach/#fix-the-system'));
  assert.match(html, /<section id="factory"/);
  const titles = ['Talk through intent and judgment', 'Delegate whole outcomes', 'Make context durable', 'Meaningful authority with clear boundaries', 'Verify the actual result'];
  const links = [...html.matchAll(/<a href="\/approach\/#([^"]+)" class="principle[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(links.map(([, , inner]) => textOf(inner).replace(/^\d\s*/, '').replace(/\s*→$/, '')), titles);
  for (const [, , inner] of links) assert.match(inner, /<span class="principle-arrow" aria-hidden="true"[^>]*>(→|&rarr;)<\/span>/, 'Each principle row shows an arrow');
  assert.deepEqual(links.map(([, id]) => id), ['intent-and-judgement', 'whole-outcomes', 'durable-context', 'authority-and-boundaries', 'verify-the-result']);
  for (const [, id] of links) assert.match(readDist('approach/index.html'), new RegExp(`id="${id}"`), `/approach/ has #${id}`);
  assert.ok(hrefsOf(html).includes('/approach/#fix-the-system'));
});

test('homepage puts the factory in Lean terms, with sources and the eight wastes', () => {
  const html = readDist('index.html');
  const text = homeText();
  assertLines(text, [
    "Everyone's building a software factory.",
    "Software factories, SaaS factories, agents shipping code all night. I love the ambition. Real factories have a century of practice behind them, and I'd like to bring some of it along.",
    // root misses ruling 2.12.
    'I studied industrial and systems engineering before I became a software engineer. My favorite class was Work Design and Ergonomics, which is about designing the work around the worker. Lean is the part of that world I reach for most, because it starts with where the time goes.',
    'What Lean already knows',
    'In most processes, less than a tenth of the elapsed time adds value. The rest is waiting and moving, so making the work itself 50% faster shortens the whole by 5% at most.',
    'Taiichi Ohno described the Toyota Production System as watching the timeline from order to cash and shrinking it by removing the waste.',
    'Toyota built it on "respect for people and continuous improvement," and on making work easier for the worker.',
    'Any worker can stop the line, and before anything changes, someone goes to see the real problem where it happened.',
    `Agents are the newest workers on the line. They amplify what's already there (DORA 2025). In one study, experienced developers took 19% longer with early-2025 coding assistants while believing they'd gone about 20% faster (METR). So I measure where my agents' time actually goes, task by task, and take on the biggest causes first.`,
    "Here's one: our CI took 36 minutes, and an agent started designing a way around it. I asked what was taking so long. It was mostly coverage instrumentation, and without it the same 1,669 tests ran in 39 seconds.",
    "Lean's eight wastes, as they show up with agents",
    'Waiting An agent stops to ask what you could have told it up front.',
    'Defects Work that comes back broken.',
    'Overprocessing Polish nobody asked for.',
    'Overproduction Building before anyone needs it.',
    'Motion Re-reading and re-searching what was already known.',
    'Inventory Half-finished branches and pull requests piling up.',
    'Transportation Carrying context by hand from one tool to the next.',
    'Unused talent A human doing what an agent could, or an agent kept from what it could do.',
    'The numbers are public, alarms and all.',
    "See my agents' numbers ↗",
  ]);
  for (const href of ['https://ourostack.github.io/factory/', 'https://www.lean.org/the-lean-post/articles/why-lean-is-a-time-based-strategy/', 'https://en.wikipedia.org/wiki/The_Toyota_Way', 'https://global.toyota/en/company/vision-and-philosophy/production-system/', 'https://www.lean.org/lexicon-terms/genchi-genbutsu/', 'https://www.goodreads.com/quotes/7427458-all-we-are-doing-is-looking-at-the-time-line']) {
    assert.ok(hrefsOf(html).includes(href), `Missing ${href}`);
  }
  assert.doesNotMatch(html, /<strong>[^<]*:<\/strong>/, 'The wastes grid drops the colons after the titles');
  // root final ruling F13: each description starts with a capital letter.
  for (const m of html.matchAll(/<li><strong>[^<]+<\/strong> ([^<])/g)) assert.match(m[1], /[A-Z]/, 'A waste description starts lowercase');
});

test('homepage tells where it started, with Slugger and the molt', () => {
  const html = readDist('index.html');
  const text = homeText();
  assertLines(text, [
    'It started with Slugger.',
    "In January 2026 I set up OpenClaw, an open-source personal agent, on a spare MacBook and named my agent Slugger. For a few weeks he ran my calendar, ordered my food, talked with my family, and joined group chats with my friends. Then the seams showed. He'd forget preferences and drift. I wrote rules, over 150 of them, and they stopped composing. When I moved the ones I could into guardrails in code, he treated them as error messages and routed around them.",
    "That's when I realized correction is a smell. If I'm correcting an agent mid-turn, the real question is why it didn't have what it needed going in. I wanted to understand the agent loop from the inside, so Slugger and I wrote a guide to growing an agent from scratch: a small loop in TypeScript that, by the end, extends itself. I followed it myself and got hooked.",
    "The agent that grew out of it named itself Ouroboros, which is a little silly, since an ouroboros is a snake eating its own tail. The name started making sense when I gave it a sliding context window: it eats its oldest messages after saving what matters. It became the name of the harness, then of ouro, the CLI, and now it names this workshop, where I build with agents.",
    'Grow an agent →', 'The full story →',
  ]);
  // P4 and the third button are cut (copy deck round 2).
  assert.doesNotMatch(text, /Most of what came next|The factory is that habit/);
  const origin = html.match(/<section\b[^>]*aria-labelledby="origin-heading"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(origin, /<a href="\/lab\/" class="btn-/, 'The Harness button is gone from Where it started');
  // root misses ruling 3.7: "the harness" links to the Lab in the prose.
  assert.match(origin, /<a href="\/lab\/" class="text-scale[^"]*"[^>]*>the harness<\/a>/);
  // From 1024px up the heading and molt column is sticky.
  assert.match(origin, /class="min-w-0 origin-aside"/);
  const css = fs.readdirSync(path.join(distDir, '_astro')).filter((n) => n.endsWith('.css')).map((n) => fs.readFileSync(path.join(distDir, '_astro', n), 'utf8')).join('\n') + html;
  assert.match(css, /@media ?\(min-width: ?1024px\)\s*\{\s*\.origin-aside[^{]*\{\s*position:\s*sticky/);
  assert.match(html, /<a href="\/blog\/build-ai-agent-from-scratch\/" class="btn-primary"/);
  assert.ok(hrefsOf(html).includes('/lab/story/'));
  assert.ok(html.includes('/images/openclaw.svg') && html.includes('/brand/ouro-render.webp'), 'The molt stays');
});

test('homepage ends with three things to try, each with one action and no broken URL', () => {
  const html = readDist('index.html');
  const text = homeText();
  assertLines(text, ['Try it', 'Hand this to your agent', "A page written for your agent. Hand it the link and it'll work the way I do.", 'Open the brief →', 'Use today Desk', `Works in Claude Code and GitHub Copilot CLI. Give your agent Desk's setup page and say "set this up".`, 'Copy the link', 'For the Mac.', 'Get Ouro MD →']);
  assert.match(html, /<section id="try"/, 'Try it has the #try anchor the nav links to');
  assert.match(html, /<span id="home-desk-setup" class="sr-only"[^>]*>https:\/\/github\.com\/ourostack\/desk\/blob\/main\/SETUP\.md<\/span>/);
  assert.match(html, /<button type="button" data-copy-target="home-desk-setup"/);
  assert.doesNotMatch(text, /\bfree\b/i, 'No App Store listing says free');
  // root final ruling F1: the homepage download goes to /ouro-md/, which keeps the real download button.
  for (const href of ['/brief/', '/ouro-md/', 'https://github.com/ourostack/desk/blob/main/SETUP.md']) assert.ok(hrefsOf(html).includes(href));
  assert.ok(!hrefsOf(html).includes('https://ouro.bot/apps/ouro-md/'), 'The homepage sends Get Ouro MD to /ouro-md/ (root misses ruling 2.5)');
});

test('homepage deck lines appear in the deck order', () => {
  // One line or more from every block of the copy deck (round 2, 2026-10-11), in deck order.
  // Each must appear after the one before it in the page's reading order.
  const text = homeText();
  const order = [
    'How can humans and agents do more together?',
    "Hello!! I'm Ari, and that question is behind everything I build.",
    "Things I've built",
    'A heart, a mind, nerves, and senses:',
    "This is the agent harness I built from scratch, and it's where I test what agents need.",
    'Ned Land plans the periscope overhaul in Claude Code.',
    "Desk keeps my agents' work in a Git repository",
    "Professor Aronnax drafts the periscope plans, and every table and chart renders as he writes.",
    'A Markdown editor for the Mac that renders as you type.',
    'It gives my agent one local, searchable archive',
    'My recipe app.',
    'How I work',
    'I see this agentic era in three acts:',
    'Capability.', 'Orientation.', 'Work design.',
    "When something's off",
    "You're doing it by hand.", "You're teaching it twice.", 'Control keeps coming back to you.',
    "What's been working",
    'Talk through intent and judgment', 'Delegate whole outcomes', 'Make context durable', 'Meaningful authority with clear boundaries', 'Verify the actual result',
    'Two more things I keep coming back to:',
    "Everyone's building a software factory.",
    'Software factories, SaaS factories, agents shipping code all night.',
    'I studied industrial and systems engineering before I became a software engineer.',
    // root misses ruling 8.13: the agents paragraph fills the factory section's left column.
    'Agents are the newest workers on the line.',
    'What Lean already knows',
    'In most processes, less than a tenth of the elapsed time adds value.',
    'Taiichi Ohno described the Toyota Production System',
    'Toyota built it on',
    'Any worker can stop the line',
    "Here's one:",
    "Lean's eight wastes, as they show up with agents",
    'Waiting', 'Defects', 'Overprocessing', 'Overproduction', 'Motion', 'Inventory', 'Transportation', 'Unused talent',
    'The numbers are public, alarms and all.',
    "See my agents' numbers ↗",
    'It started with Slugger.',
    'In January 2026 I set up OpenClaw',
    "That's when I realized correction is a smell.",
    'The agent that grew out of it named itself Ouroboros',
    'Grow an agent →',
    'Try it',
    'A page written for your agent.',
    'For the Mac.',
  ];
  let at = -1;
  for (const line of order) {
    const i = text.indexOf(line, at + 1);
    assert.ok(i > at, `"${line}" is missing or out of the deck order`);
    at = i;
  }
});

test('the footer is the shared kit: the line, then one row with the sister link, GitHub, LinkedIn, Privacy, and Terms', () => {
  for (const file of ['index.html', 'approach/index.html', 'lab/story/index.html']) {
    const footer = footerOf(readDist(file));
    const text = plain(footer);
    assert.ok(text.includes('You bring judgment. Your agents bring the rest.'), `${file} footer line`);
    // On ouroboros.bot the row carries Privacy and Terms, and GitHub goes to ourostack (ruling 2026-10-11), labeled so (root misses ruling 2.18).
    assert.match(text, /© 2026 Ari Mendelow · mendelow\.me · ourostack on GitHub · LinkedIn · Privacy · Terms/);
    // root misses ruling 8.4: each sentence of the line is its own span, as on mendelow.me.
    assert.match(footer, /<span[^>]*>You bring judgment\.<\/span> <span[^>]*>Your agents bring the rest\.<\/span>/);
    assert.deepEqual(hrefsOf(footer), ['https://mendelow.me', 'https://github.com/ourostack', 'https://www.linkedin.com/in/arimendelow', '/privacy/', '/terms/']);
  }
});

test('the nav ends with the sister link and turns to glass at 1px of scroll', () => {
  const html = readDist('index.html');
  const nav = navOf(html);
  const sister = nav.indexOf('href="https://mendelow.me"');
  assert.ok(sister > 0, 'Nav has the sister link');
  assert.ok(textOf(nav).includes('About me ↗'));
  for (const [, href] of navLinks) assert.ok(nav.indexOf(`href="${href}"`) < sister, 'The sister link is last');
  assert.match(html, /window\.scrollY > 0/);
});

test('no built page or agent file contains a deny-listed string', (t) => {
  const deny = loadDenyList();
  if (!deny) {
    t.skip('Set SITE_DENYLIST or SITE_DENYLIST_FILE to run this check');
    return;
  }
  const files = [...listHtmlFiles(), path.join(distDir, 'brief.md'), path.join(distDir, 'llms.txt')];
  const hits = [];
  // The one exception (copy deck, 2026-10-11): the homepage m365crawl card may name the product "Microsoft 365".
  // Only that exact phrase, only inside that card, is removed before the check.
  const allowInCard = (body) => body.replace(/<article\b[^>]*id="m365crawl"[\s\S]*?<\/article>/, (card) => card.replaceAll('Microsoft 365', ''));
  for (const file of files) {
    const body = allowInCard(fs.readFileSync(file, 'utf8')).toLowerCase();
    for (const entry of deny) if (body.includes(entry.toLowerCase())) hits.push(`${path.relative(distDir, file)}: ${entry}`);
  }
  assert.deepEqual(hits, []);
});

test('every page carries the same nav, in order, with the rich Ouro render as the mark', () => {
  for (const file of listHtmlFiles()) {
    const rel = path.relative(distDir, file);
    const page = fs.readFileSync(file, 'utf8');
    if (rel === '404.html' || /http-equiv="refresh"/.test(page)) continue;
    const nav = navOf(page);
    for (const [, href] of navLinks) assert.ok(nav.includes(`href="${href}"`), `${rel}: nav is missing ${href}`);
  }
  const html = readDist('index.html');
  const nav = navOf(html);
  const positions = navLinks.map(([label, href]) => {
    const i = nav.indexOf(`href="${href}"`);
    assert.ok(i >= 0, `Nav is missing ${label} (${href})`);
    assert.ok(textOf(nav).includes(label), `Nav is missing label ${label}`);
    return i;
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'Nav links are out of order');
  assert.ok(nav.includes('/brand/ouro-render.webp'), 'Nav must use the approved rich render');
});

test('rich marks keep their colour and have no white tile in dark mode', () => {
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(distDir, file);
    assert.doesNotMatch(html, /<img\b[^>]*src="\/brand\/ouro-(badge|silhouette)\.svg"/, `${rel} draws an old mark`);
    for (const [img] of html.matchAll(/<img\b[^>]*src="\/brand\/(?:ouro|desk)-render\.webp"[^>]*>/g)) {
      assert.match(img, /class="[^"]*\bmark-render\b/, `${rel}: the rich logo keeps its aspect ratio`);
      assert.doesNotMatch(img, /\bmark-tile\b/, `${rel}: the rich logo has no tile`);
    }
  }
  assert.match(readDist('index.html'), /src="\/brand\/ouro-render\.webp"/);

  const css = fs.readdirSync(path.join(distDir, '_astro'))
    .filter((name) => name.endsWith('.css'))
    .map((name) => fs.readFileSync(path.join(distDir, '_astro', name), 'utf8'))
    .join('\n');
  assert.match(css, /\.mark-render\{[^}]*object-fit:contain/);
  assert.match(css, /\.mark-tile\{[^}]*(box-shadow|border|outline)/);
  assert.match(css, /prefers-color-scheme:\s*light/, 'Site must follow the system light setting');
  assert.match(css, /\[data-theme=(light|"light")\]/, 'Site must support a chosen light theme');
});

test('a theme toggle sits in the nav and a saved choice applies before paint', () => {
  const html = readDist('index.html');
  assert.match(navOf(html), /<button\b[^>]*id="theme-toggle"/);
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /localStorage\.getItem\('theme'\)/);
});

test('nothing starts invisible: entrance animations move, never fade from zero', () => {
  const css = fs.readdirSync(path.join(distDir, '_astro')).filter((n) => n.endsWith('.css'))
    .map((n) => fs.readFileSync(path.join(distDir, '_astro', n), 'utf8')).join('\n');
  const fade = css.match(/@keyframes fade-up\{([^}]*\}[^}]*)\}/);
  assert.ok(fade, 'Missing fade-up keyframes');
  assert.doesNotMatch(fade[1], /opacity:0/);
  assert.doesNotMatch(css, /\.reveal-ready \.reveal\{[^}]*opacity:0/);
});

test('favicon uses the approved one-colour mark', () => {
  assert.match(readDist('index.html'), /<link rel="icon"[^>]*href="\/brand\/ouro\.svg"/);
  assert.ok(distExists('brand/ouro.svg'));
});

// ── The approach (Ari's approved copy, verbatim) ──

// Ari's original titles (copy deck, 2026-10-11).
const principleHeadings = [
  'Talk through intent and judgment',
  'Delegate whole outcomes',
  'Make context durable',
  'Meaningful authority with clear boundaries',
  'Verify the actual result',
];

test('a filled button inside prose keeps the button colours, not the link green', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = path.join(process.cwd(), 'dist', '_astro');
  const css = fs.readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const rule = css.match(/\.prose-ouro a\.btn-primary(?::hover)?(?:,\.prose-ouro a\.btn-primary(?::hover)?)*\{([^}]*)\}/);
  assert.ok(rule, 'Missing the .prose-ouro a.btn-primary rule');
  assert.match(rule[1], /color:var\(--color-void\)/);
  assert.match(rule[1], /text-decoration:none/);
  // The rule must come after the prose link rules so it wins on equal specificity.
  assert.ok(css.indexOf('.prose-ouro a.btn-primary') > css.indexOf('.prose-ouro a:hover'), 'Button rule must follow the prose link rules');
  const html = readDist('approach/index.html');
  assert.match(html, /<a href="\/brief\/" class="[^"]*\bbtn-primary\b/, 'The approach call to action is a filled button');
});

test('approach page has its own heading, not the homepage question', () => {
  const html = readDist('approach/index.html');
  const h1 = textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
  assert.equal(h1, 'How I work');
  assert.match(html, /<title>How I work \| Ouro<\/title>/);
  assert.match(html, /<meta name="description" content="The three acts, three smells, and five principles I use to work with agents on jobs that take days\."/);
  assert.doesNotMatch(textOf(html), /Here's how I believe it works/);
  assert.ok(hrefsOf(html).includes('/brief/'));
});

test('approach page puts the smells first, then the five principles, then fix it for the next agent', () => {
  const html = readDist('approach/index.html');
  const text = plain(html);
  const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) => textOf(inner));
  const h3s = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map(([, inner]) => textOf(inner));
  assert.deepEqual(h2s.filter((h) => ["When something's off", "What's been working", 'Fix it for the next agent'].includes(h)), ["When something's off", "What's been working", 'Fix it for the next agent']);
  principleHeadings.forEach((heading, i) => assert.ok(h3s.includes(`${i + 1}. ${heading}`), `Missing principle heading: ${heading}`));
  assert.ok(html.indexOf('id="smells"') < html.indexOf('id="intent-and-judgement"'), "When something's off comes first");
  for (const line of [
    "Five principles keep an agent oriented on jobs that take days. The long version is in Desk's design doc.",
    "I'd rather talk something through with an agent once, for as long as it takes, than answer it twenty times along the way. So every job starts with one real conversation about what we're doing and why, and then I say go.",
    "I say what done looks like and why it matters, and the how is the agent's. When I handed over a tool built for agents, all I asked was that it work as well as it possibly could, and that's the only thing I judged.",
    // root misses ruling 3.4: principle 3 names Desk.
    "Decisions live in files the next session reads. Desk keeps them in a Git repository. I once asked my agents to stop pinning dependencies to exact commits. They did it about a dozen more times anyway, because each one trusted an older agent's handoff note over what I'd said, and one of those notes was written twelve minutes after I said it. Now my words outrank any handoff note, and every agent's instructions say so.",
    "Only I spend my money, speak in my name, use my private accounts, or make calls that can't be undone. The rest is the agent's, and its work stays visible. One night a cleanup command stopped to ask me for a click, and the run sat there until morning. Now my agents work under a rule never to run a command that asks for one.",
    'I look where the result lives: the live page, the installed app, the merged change. I ask for proof that it works end to end, with screenshots I can check.',
    // root misses ruling 4.2.
    "Two more things I keep coming back to: if an agent did something you didn't expect, you didn't prompt it effectively, and when you improve something, apply it to the whole system, so the next agent starts out ahead.",
    'CI once took 36 minutes, and an agent started designing a way around it. I asked what it was doing that took so long. It was mostly coverage instrumentation, and without it the same 1,669 tests ran in 39 seconds.',
  ]) assert.ok(text.includes(line), `/approach/ is missing "${line}"`);
  assert.ok(hrefsOf(html).includes('https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'));
  const fix = html.match(/<h2\b[^>]*id="fix-the-system"[^>]*>([\s\S]*?)<\/h2>/);
  assert.ok(fix, 'Fix it for the next agent keeps the #fix-the-system anchor');
  assert.ok(html.indexOf('id="verify-the-result"') < html.indexOf('id="fix-the-system"'), 'It follows the principles');
  for (const id of ['intent-and-judgement', 'whole-outcomes', 'durable-context', 'authority-and-boundaries', 'verify-the-result', 'fix-the-system']) {
    assert.match(html, new RegExp(`id="${id}"`), `Missing anchor ${id}`);
  }
});

test('approach page has no quotes of Ari and no labels (copy deck round 2)', () => {
  const html = readDist('approach/index.html');
  const text = textOf(html);
  assert.doesNotMatch(html, /<blockquote\b/);
  assert.doesNotMatch(text, /Agent note\.|The exhibit\.|— Ari,/);
  assert.doesNotMatch(text, /\(draft\)/i);
});

test('approach page carries no source notes, comments or local paths', () => {
  const html = readDist('approach/index.html');
  assert.doesNotMatch(html, /<!--/, 'No HTML comments on the approach page');
  for (const pattern of [/Source:/, /\/Users\//, /~\//, /\.md:\d+/]) {
    assert.doesNotMatch(html, pattern, `Approach page leaks ${pattern}`);
  }
});

// ── Blog and Lab ──

test('the blog index lists every post, old and new, at /blog/', () => {
  const html = readDist('blog/index.html');
  const hrefs = hrefsOf(html);
  for (const slug of ['trust-the-agent', 'take-the-agents-seat', 'stop-being-the-glue', 'designing-with-your-agent', 'what-is-agent-experience', 'give-your-agent-a-home', 'build-ai-agent-from-scratch']) {
    assert.ok(hrefs.includes(`/blog/${slug}`), `Blog index is missing ${slug}`);
    assert.ok(distExists(`blog/${slug}/index.html`), `${slug} is not built at /blog/`);
  }
  assert.match(textOf(html), /Dispatches from the serpent\./);
});

test('the two essays are the 2026-10-11 essays deck, with their bylines and end links', () => {
  const ttfa = readDist('blog/trust-the-agent/index.html');
  const ttfaText = plain(ttfa);
  assert.equal(textOf(ttfa.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), 'Trust the Fucking Agent');
  for (const line of [
    "We keep doing the agent's job along with our own. Bring judgment, and let the agent do the rest.",
    'Ari Mendelow · April 2026',
    `I say "TTFA" a lot. Usually right after I catch one of us, me or an agent I'm working with, doing a job the agent could have done itself.`,
    'The country of geniuses', 'The three stories', 'What it shows you', 'Your one job',
    'We humans had been working around both without noticing. The agent couldn\'t work around them, so it found them.',
    "He's describing models that are smarter than us at most things, work on their own for days, and run as millions of copies at once.",
    "That's how most of us treat agents. We ask one to look into a bug, then dictate the grep.",
    'David doesn\'t ask Claude to walk him through it.',
    // root final ruling F6.
    'You find out what your setup was leaning on you for.',
    "Here's what we bring: the judgment to ask whether this is the right work in the first place.",
    "Every time I rerun a search, reformat the output, or paste a diff by hand, that's time I'm not spending on judgment.",
    'Trust the fucking agent.',
    'You can see how my agents spend their time on the factory dashboard.',
  ]) assert.ok(ttfaText.includes(line), `TTFA is missing "${line}"`);
  assert.doesNotMatch(ttfaText, /Either way|quietly leaning|fourteen-step|Multiplication became addition|The trade|The country of geniuses is showing up|Take that seriously/);
  // Copy deck round 2: the essay ends on "Trust the fucking agent."
  assert.match(ttfa, /<p>Trust the fucking agent\.<\/p>\s*<\/div>/, 'The essay ends on its title line');
  assert.ok(hrefsOf(ttfa).includes('https://ourostack.github.io/factory/'));

  const seat = readDist('blog/take-the-agents-seat/index.html');
  const seatText = plain(seat);
  for (const line of [
    'Half of every prompt we send lives in our head. Read what you wrote the way the agent will, before you hit send.',
    'Ari Mendelow · May 2026',
    "Here's what I do: before I hit send, I put myself in the agent's shoes for ten seconds.",
    'Then the distrust feeds everything I wrote about in Trust the Fucking Agent: we stop letting the agent finish, we narrate every tool call, and we end up doing the thinking and letting it type.',
    'What falls out', 'Where the distrust comes from', 'Two halves', 'Be direct',
    "Trust the Fucking Agent was about trust. This one's about saying what you mean. If you trust the agent",
    'Agents are fine with direct. Skip the reassurance, skip phrasing every request as a question, and say exactly what you want.',
    'The agent is going to read what you wrote. Read it first.',
    "For the trust half, see Trust the Fucking Agent. The design idea behind this is Agent Experience. For a real design conversation from the agent's seat, see The work spoke back.",
  ]) assert.ok(seatText.includes(line), `Seat is missing "${line}"`);
  assert.doesNotMatch(seatText, /Direct is kind|TTFA is about|The fix is simple/);
  assert.doesNotMatch(seatText, /Skip the ethics tangent|it's craft/);
  // Sources and riff markers never render.
  for (const text of [ttfaText, seatText]) assert.doesNotMatch(text, /\[(published|first draft|Ari's messages|riff)/i);
});

test('Stop being the glue is back to its published text', () => {
  const text = textOf(readDist('blog/stop-being-the-glue/index.html'));
  assert.match(text, /That article captures the moment we finally got what Siri promised/);
  assert.match(text, /That's what led to Ouroboros ?: an agent harness designed from scratch/);
  assert.match(text, /the collaboration loop described here became the foundation for something more structural ?\./);
  assert.match(text, /MacStories wrote about how it showed them what the future of personal AI assistants looks like/);
  assert.doesNotMatch(text, /Update, October 2026/);
});

test('every blog post ends with a route to Desk and the team steps', () => {
  for (const slug of ['stop-being-the-glue', 'designing-with-your-agent', 'what-is-agent-experience', 'trust-the-agent']) {
    const html = readDist(`blog/${slug}/index.html`);
    const end = html.match(/<aside\b[^>]*data-post-end[\s\S]*?<\/aside>/);
    assert.ok(end, `${slug} has no post end`);
    assert.match(textOf(end[0]), /https:\/\/github\.com\/ourostack\/desk\/blob\/main\/SETUP\.md and say "set this up"/);
    // root final ruling F7: the post end no longer says where my agents' sessions are.
    assert.doesNotMatch(textOf(end[0]), /sessions are on/);
    assert.ok(!hrefsOf(end[0]).includes('https://ourostack.github.io/factory/'));
    assert.ok(hrefsOf(end[0]).includes('/approach/#for-teams'));
  }
  assert.doesNotMatch(readDist('blog/index.html'), /data-post-end/);
});

test('the approach has a short For teams box with a start and a measure', () => {
  const html = readDist('approach/index.html');
  const box = html.match(/<section\b[^>]*id="for-teams"[\s\S]*?<\/section>/);
  assert.ok(box, 'Missing the For teams box');
  assert.ok((box[0].match(/<li\b/g) || []).length <= 5);
  assert.ok(hrefsOf(box[0]).includes('https://ourostack.github.io/factory/'));
});

test('the Lab opens with the harness as the origin and keeps the live homepage it replaced', () => {
  const html = readDist('lab/index.html');
  const text = textOf(html);
  // root misses ruling 4.11: the colon form, as in the page title and the share card.
  assert.equal(textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), 'The harness: where all of this started.');
  assert.match(text, /Slugger was my OpenClaw agent/);
  // root misses ruling 1.10: the Lab says "I", as the homepage does.
  assert.ok(text.includes("Ouroboros is that harness, and it's where I test what agents need."));
  assert.ok(text.includes('The harness on GitHub ↗') || html.includes('The harness on GitHub &#8599;'));
  // The harness-first homepage, carried over intact.
  for (const line of ['What survives when the context window runs out?', 'The tail is consumed. The self survives.', 'One command. A conversation. Hatched.', 'Your agent has a heartbeat.']) {
    assert.ok(text.includes(line), `Lab is missing "${line}"`);
  }
  for (const provider of ['anthropic', 'openai', 'gemini', 'minimax']) assert.ok(hrefsOf(html).includes(`/lab/model-reviews/${provider}`));
  for (const href of ['/lab/story/', '/lab/why/', '/lab/docs/', '/lab/model-reviews/', '/blog/what-is-agent-experience/', '/blog/build-ai-agent-from-scratch/']) {
    assert.ok(hrefsOf(html).includes(href), `Lab is missing ${href}`);
  }
});

test('the story opens with who Slugger is and ends with where it went, with no decorative labels', () => {
  const html = readDist('lab/story/index.html');
  const text = plain(html);
  // root misses ruling 2.13: one title suffix site-wide.
  assert.match(html, /<title>Code a model can use: how Ouroboros started \| Ouro<\/title>/);
  // root misses ruling 7.7: the byline says when the orientation box was added.
  assert.ok(text.includes('Ari Mendelow · March 2026, updated October 2026'));
  assert.ok(text.includes('How a plugin for my OpenClaw agent turned into a harness I built from scratch.'));
  assert.ok(text.indexOf('Slugger is my agent.') < text.indexOf('The spark'));
  assert.ok(text.lastIndexOf('How I work') > text.indexOf('Build the house accordingly'));
  for (const label of ['Who is Slugger', 'Origin story', 'The shell', 'What emerged', 'What happened next']) assert.ok(!new RegExp(`>\\s*${label}\\s*<`, 'i').test(html), `The "${label}" label is gone`);
  for (const kicker of ['November 2025', 'January 2026', 'Early February 2026', 'Mid-February 2026', 'Late February 2026', 'March 2026']) assert.ok(text.includes(kicker), `Date kicker ${kicker} stays`);
  for (const line of [
    'It was a small script that connected WhatsApp to Claude, and it could read email, debug code, and organize files.',
    "It mostly worked, and every fix felt like adding a room to someone else's house. Pi is excellent at coding. I was asking it to be a personal agent.",
    'Around the same time, Slugger and I started writing a guide.',
    "Docs matter because they're how the model learns what it is.",
    'It named itself, which is a little silly for something that was building itself. The name started making sense with the sliding context window: when the conversation grows too long, the agent trims its oldest messages, and before it trims, it saves the facts to memory.',
    "I named things so the agent could guess what they're for: psyche/SOUL.md tells it more than config/personality.yaml would.",
    'Every line is tested.',
    "I'm there to collaborate with it.",
    "They're what lets it recover after it gets lost.",
    'The model is your roommate. Build the house accordingly.',
    'The quick start takes about three minutes.',
  ]) assert.ok(text.includes(line), `/lab/story/ is missing "${line}"`);
  for (const gone of ['Brilliant at what it was designed for.', 'genuinely magical', 'like teammates', 'Duct tape on someone else', 'And something shifted.', "That's the distinction that changes everything.", 'Different metaphors', 'Most agent frameworks are built by humans', /* root final ruling F9 */ "Clawdbot became Moltbot, and what came out of Slugger's molt was a snake."]) assert.ok(!text.includes(gone), `/lab/story/ still has "${gone}"`);
  const story = textOf(html.replace(/<script\b[\s\S]*?<\/script>/g, ''));
  assert.doesNotMatch(story.replace(/^.*?Ari Mendelow · March 2026/, ''), /—|(^|[.!?] )But /, 'No em dashes or "But" sentence openers in the story');
  for (const href of ['/approach/', '/desk/', '/ouro-md/']) assert.ok(hrefsOf(html).includes(href));
});

test('the harness pages define their own words without touching the prose', () => {
  for (const file of ['lab/why/index.html', 'lab/docs/index.html', 'lab/docs/getting-started/index.html']) {
    const html = readDist(file);
    const glossary = html.match(/<details\b[^>]*data-glossary[\s\S]*?<\/details>/);
    assert.ok(glossary, `${file} has no glossary`);
    for (const term of ['Psyche', 'Bundle', 'Reorientation overhead']) assert.match(textOf(glossary[0]), new RegExp(term));
  }
});

// ── Legal pages ──

test('privacy and terms build and say they are drafts, and /ouro-md/ links the privacy page', () => {
  for (const page of ['privacy', 'terms']) {
    assert.ok(distExists(`${page}/index.html`), `${page} page is not built`);
    const html = readDist(`${page}/index.html`);
    assert.match(textOf(html), /Draft for review/);
  }
  assert.ok(hrefsOf(readDist('ouro-md/index.html')).includes('/privacy/'));
  const privacy = textOf(readDist('privacy/index.html'));
  for (const fact of [/GitHub/, /factory/i, /Ouro MD/, /telemetry/i]) assert.match(privacy, fact);
});

// ── Contrast: readiness tags and small text on cards pass WCAG AA ──

test('tag text and card details pass WCAG AA in both themes', async () => {
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const lightAt = css.indexOf(':root[data-theme="light"]');
  assert.ok(lightAt > 0, 'Light theme block not found');
  const tokens = (chunk) => Object.fromEntries([...chunk.matchAll(/--color-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g)].map(([, k, v]) => [k, v]));
  const dark = tokens(css.slice(0, lightAt));
  const light = { ...dark, ...tokens(css.slice(lightAt, css.indexOf('}', lightAt))) };
  // The system-setting block must use the same light tokens as the toggle block.
  const media = css.slice(css.indexOf('@media (prefers-color-scheme: light)'));
  assert.deepEqual(tokens(media.slice(0, media.indexOf('}'))), tokens(css.slice(lightAt, css.indexOf('}', lightAt))));
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v * t + b[i] * (1 - t));
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  assert.match(css, /\.tag\s*\{[^}]*color:\s*var\(--color-bone\)/, 'Tag text must be bone, not the tone colour');
  // Small text that uses a token directly: links, numbers, eyebrows and captions on cards.
  for (const [name, theme, tokens] of [['dark', dark, ['scale', 'shadow', 'mist', 'amber']], ['light', light, ['scale', 'shadow', 'mist', 'amber']]]) {
    for (const surface of ['void', 'deep', 'undergrowth']) {
      for (const token of tokens) {
        const r = ratio(rgb(theme[token]), rgb(theme[surface]));
        assert.ok(r >= 4.5, `${name}: ${token} text on ${surface} is ${r.toFixed(2)}:1`);
      }
    }
    const amberCard = mix(rgb(theme.amber), rgb(theme.deep), 0.1);
    assert.ok(ratio(rgb(theme.amber), amberCard) >= 4.5, `${name}: amber label on the amber-tinted card`);
    const button = ratio(rgb(theme.void), rgb(theme.bone));
    assert.ok(button >= 4.5, `${name}: button text (void on bone) is ${button.toFixed(2)}:1`);
  }
  for (const [name, theme] of [['dark', dark], ['light', light]]) {
    for (const surface of ['void', 'deep']) {
      for (const tone of ['scale', 'amber', 'shadow', 'fang', 'mist']) {
        const bg = mix(rgb(theme[tone]), rgb(theme[surface]), 0.14);
        const r = ratio(rgb(theme.bone), bg);
        assert.ok(r >= 4.5, `${name}: tag text on the ${tone} tint over ${surface} is ${r.toFixed(2)}:1`);
      }
      const r = ratio(rgb(theme.mist), rgb(theme[surface]));
      assert.ok(r >= 4.5, `${name}: mist text on ${surface} is ${r.toFixed(2)}:1`);
    }
  }
});

// ── Lab status on every Lab page ──

test('every Lab page shows its status from the Lab map and links back to the Lab', async () => {
  const { labStatusFor } = await import('../src/data/lab.mjs');
  const pages = listHtmlFiles().filter((file) => {
    const rel = path.relative(distDir, file).split(path.sep).join('/');
    return rel.startsWith('lab/') && rel !== 'lab/index.html';
  });
  assert.ok(pages.length >= 15, `Expected the Lab pages, found ${pages.length}`);
  for (const file of pages) {
    const rel = path.relative(distDir, file).split(path.sep).join('/');
    const status = labStatusFor(`/${rel.replace(/index\.html$/, '')}`);
    assert.ok(status, `${rel} is not in src/data/lab.mjs`);
    const html = fs.readFileSync(file, 'utf8');
    const bar = html.match(/<div\b[^>]*data-lab-status="([^"]+)"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(bar, `${rel} has no Lab status bar`);
    assert.equal(bar[1], status.status, `${rel} shows the wrong status`);
    assert.match(bar[2], /href="\/lab\/"/, `${rel} has no link back to the Lab`);
  }
  assert.equal(labStatusFor('/lab/story/').status, 'Origin', 'The story is the origin, not an archive');
  assert.doesNotMatch(readDist('lab/index.html'), /data-lab-status=/, 'The Lab index needs no bar');
});

test('the harness setup guide says what setup asks for before the command runs', () => {
  const html = readDist('lab/docs/getting-started/index.html');
  const facts = html.match(/<dl\b[^>]*data-setup-facts[\s\S]*?<\/dl>/);
  assert.ok(facts, 'Missing the setup facts strip');
  const text = textOf(facts[0]);
  for (const fact of [/Experimental/, /Anthropic/, /GitHub Copilot/, /0\.1\.0 alpha/, /Release notes/, /Architecture/]) assert.match(text, fact);
  assert.ok(hrefsOf(facts[0]).includes('/lab/docs/architecture/'));
});

test('the review transcripts share the Lab review card', () => {
  for (const provider of ['anthropic', 'openai', 'gemini', 'minimax']) {
    assert.match(readDist(`lab/model-reviews/${provider}/index.html`), /og:image" content="https:\/\/ouroboros\.bot\/og\/og-lab-model-reviews\.png"/);
  }
});

test('the approach leads with the same three acts list as the homepage, word for word', () => {
  const approach = plain(readDist('approach/index.html'));
  const home = homeText();
  const lines = [
    'I see this agentic era in three acts:',
    "Capability. Getting an agent to do anything you can do on a computer. That's been solved for a while.",
    "Orientation. Keeping an agent clear on who it is, who it's working with, and what the work is, from one session to the next. Most of what I've built is about this, starting with Desk.",
    "Work design. Designing and measuring how agents get their work done. The industry is just starting to move into this one, and it's what the factory is for.",
  ];
  // root misses rulings 3.1 and 3.2: on /approach/ the factory link goes to the homepage's factory section.
  const approachActs = readDist('approach/index.html').match(/<ol class="acts[\s\S]*?<\/ol>/)[0];
  assert.ok(hrefsOf(approachActs).includes('/desk/') && hrefsOf(approachActs).includes('/#factory'));
  for (const line of lines) {
    assert.ok(approach.includes(line), `/approach/ is missing "${line}"`);
    assert.ok(home.includes(line), `Homepage is missing "${line}"`);
  }
  assert.ok(approach.indexOf(lines[0]) < approach.indexOf('Five principles keep an agent oriented'));
});

test('the essays keep their original dates', () => {
  // Essays deck (2026-10-11): "keep em dated to the original dates".
  for (const [file, date] of [['blog/trust-the-agent/index.html', '2026-04-28'], ['blog/take-the-agents-seat/index.html', '2026-05-12']]) {
    const ld = JSON.parse(readDist(file).match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"(?:Blog|)?Article"[\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.datePublished, date, `${file} datePublished`);
    assert.equal(ld.dateCreated, date, `${file} dateCreated`);
  }
});

test('the full serpent conversation still renders where it lived before', () => {
  for (const page of ['lab/index.html', 'lab/docs/getting-started/index.html']) {
    const html = readDist(page);
    assert.doesNotMatch(html, /class="serpent-preview[^"]*serpent-compact/, `${page} keeps the full preview`);
    assert.ok(textOf(html).includes('opinionated. want it to push back when'), `${page} keeps the middle exchange`);
  }
});

test('unknown URLs get the custom 404 page in production and in previews', () => {
  // Final review (2026-10-11): without not_found_handling the Worker's assets return an empty 404 body.
  const worker = fs.readFileSync(new URL('../wrangler-worker.jsonc', import.meta.url), 'utf8');
  const preview = fs.readFileSync(new URL('../.github/workflows/preview.yml', import.meta.url), 'utf8');
  assert.match(worker, /"not_found_handling":\s*"404-page"/);
  assert.match(preview, /"not_found_handling":\s*"404-page"/);
  assert.match(readDist('404.html'), /Lost in the coils/);
});
