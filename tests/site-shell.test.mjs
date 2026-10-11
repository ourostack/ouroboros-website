import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readDist, textOf, hrefsOf, distExists, listHtmlFiles, distDir, loadDenyList } from './support/dist.mjs';

const navLinks = [
  ['Approach', '/approach/'],
  ['Desk', '/desk/'],
  ['Ouro MD', '/ouro-md/'],
  ['Story', '/lab/story/'],
  ['Lab', '/lab/'],
  ['Blog', '/blog/'],
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

test('homepage asks the question and answers with Ari\'s own lines, with a small portrait linking to mendelow.me', () => {
  const html = readDist('index.html');
  const h1 = textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
  assert.equal(h1, 'How do you effectively collaborate with agents?');

  const text = plain(html);
  assert.ok(text.includes("I'm Ari. I build products for humans + agents. People keep ending up as the glue between half-smart tools, copying out of one and pasting into the next. The software should carry that context so you do not have to."));
  assert.doesNotMatch(text, /Here's how I believe it works/, 'The table-of-contents subline is gone');
  assert.match(html, /<a href="https:\/\/mendelow\.me" class="hero-pic[^"]*"[^>]*>\s*<img src="\/images\/workshop\/ari-portrait\.jpg"[^>]*width="600" height="824"/);
  assert.ok(text.includes('More about me →'));
  assert.ok(distExists('images/workshop/ari-portrait.jpg'), 'The portrait is copied locally, never hotlinked');
  assert.doesNotMatch(html, /src="https?:\/\//, 'No hotlinked images');

  // On a phone the portrait sits small beside the subline, not a screen of its own.
  const css = fs.readdirSync(path.join(distDir, '_astro')).filter((n) => n.endsWith('.css')).map((n) => fs.readFileSync(path.join(distDir, '_astro', n), 'utf8')).join('\n') + html;
  assert.match(css, /\.portrait(\[[^\]]+\])?\{[^}]*width:6\.5rem/);

  assert.doesNotMatch(text, /write down what matters/);
  assert.doesNotMatch(text, /✦ Ari Mendelow/);
  assert.doesNotMatch(html, /ouroboros-spin/, 'The ring lives on /lab/ only');
  assert.match(readDist('lab/index.html'), /ouroboros-spin/);
});

test('homepage shows what Ari built with agents, each with captioned media of the same height, a line and a link', async () => {
  const html = readDist('index.html');
  const text = plain(html);
  assert.ok(text.includes("What I've built with agents"));
  for (const line of [
    "Markdown that renders as you write. It's where I read and answer what my agents write.",
    "A photo-first kitchen for the recipes you actually cook. The same operations that power the app are exposed to an agent, so it does the work through the exact surface you'd use by hand.",
    "My agents' work lives in a Git repository: tasks, decisions and lessons, so the next session picks up where the last one left off.",
    'An open-source harness for personal agents that need an identity, durable state, real tools, and a place to live. Every frontier model we tested chose it from eleven harnesses as the one it would most want to wake up in.',
  ]) assert.ok(text.includes(line), `Homepage is missing "${line}"`);
  for (const href of ['/ouro-md/', 'https://spoonjoy.app', '/desk/', '/lab/', '/lab/model-reviews/']) assert.ok(hrefsOf(html).includes(href), `Missing ${href}`);
  assert.match(html, /<a href="\/lab\/model-reviews\/"[^>]*>chose it from eleven harnesses<\/a>/, 'The vote claim links to its evidence');

  // The claim is derived from the review data, not typed in.
  const reviews = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/model-reviews.json'), 'utf8'));
  assert.equal(reviews.harnesses.length, 11);
  assert.equal(reviews.summary.verdicts[reviews.summary.winner], reviews.summary.totalReviews);
  assert.match(fs.readFileSync(path.join(process.cwd(), 'src/pages/index.astro'), 'utf8'), /modelReviews\.harnesses\.length/);

  const poster = html.match(/<img\b[^>]*src="\/images\/workshop\/ouro-md-reload-poster\.png"[^>]*>/);
  assert.ok(poster, 'Missing the Ouro MD poster');
  assert.match(poster[0], /data-gif="\/images\/workshop\/ouro-md-reload\.gif"/);
  assert.match(poster[0], /data-gif-alt="[^"]*3 times their captured rate/);
  assert.ok(text.includes('Agent revises the same file; the person stays in place (3× captured playback).'));
  for (const [file, w, h] of [['spoonjoy-app.jpg', 1000, 625], ['desk-task-card.jpg', 900, 733], ['ouroboros-model-review.jpg', 1000, 484]]) {
    assert.match(html, new RegExp(`<img\\b[^>]*src="/images/workshop/${file.replace('.', '\\.')}"[^>]*width="${w}" height="${h}"`), `${file} is sized`);
    assert.ok(distExists(`images/workshop/${file}`));
  }
  assert.equal((html.match(/class="product-media/g) || []).length, 4, 'Every product has media');
  assert.equal((html.match(/<figcaption class="product-caption"/g) || []).length, 4, 'Every product image has a caption');
  for (const gone of ['spoonjoy.jpg', 'factory-longest-sessions.jpg']) assert.ok(!distExists(`images/workshop/${gone}`), `${gone} should be gone`);
});

test('homepage says how Ari works in his own words and links each principle', () => {
  const html = readDist('index.html');
  const text = plain(html);
  assert.ok(text.includes("I view this agentic era as three acts: capability, orientation, and work design. Capability has been solved for some time. Everything else I've worked on has been about orientation. Now the industry is starting to move into the third act: designing and measuring how agents get their work done."));
  assert.ok(text.includes('I studied industrial and systems engineering, and my favorite class was Work Design and Ergonomics: designing the work around the worker instead of making the worker absorb the friction. Agent Experience is that idea, pointed at the agent.'));
  assert.doesNotMatch(text, /so I already have tools to reach for/);
  assert.match(text, /\+1 Fix the system, not the instance \(proposed\)/);
  assert.ok(text.includes('Five principles and a proposed sixth, with the moments that taught me each one →'));
  assert.ok(hrefsOf(html).includes('/approach/'));
  assert.ok(hrefsOf(html).includes('/blog/what-is-agent-experience/'));
});

test('homepage gives Slugger and the harness a real place, in concrete lines from the story', () => {
  const html = readDist('index.html');
  const text = plain(html);
  assert.match(text, /It started with Slugger\./);
  const story = plain(readDist('lab/story/index.html'));
  for (const quote of [
    'Slugger managed my calendar. Ordered food. Drafted messages. Talked to my family.',
    'Slugger would forget preferences between sessions. Identity would drift.',
    'I built the 150-line bootstrap. Ran it. Started talking to it.',
    "OpenClaw's mascot is a lobster.",
    "The interim name was Moltbot — the lobster shedding its shell. But what emerged from Slugger's molt wasn't another crustacean. It was a snake, eating its own tail.",
  ]) {
    assert.ok(text.includes(quote), `Homepage is missing "${quote}"`);
    assert.ok(story.includes(quote), `"${quote}" is not verbatim from the story`);
  }
  assert.ok(text.indexOf("OpenClaw's mascot is a lobster.") < text.indexOf('another crustacean'), 'The lobster is set up first');
  for (const bare of ['Then the seams started showing.', 'Then I followed my own guide.']) assert.ok(!text.includes(bare), `Bare beat "${bare}" is back`);
  for (const when of ['January 2026', 'Early February 2026', 'Late February 2026']) assert.ok(story.includes(when), `${when} is not a story date`);
  assert.ok(hrefsOf(html).includes('/lab/story/'));
});

test('homepage states the factory number in one plain sentence, dated, without a screenshot', async () => {
  const { longestSession, longestHours } = await import('../src/data/factory.mjs');
  assert.equal(longestHours, '172.7');
  assert.equal(longestSession.asOf, 'October 2026');
  const html = readDist('index.html');
  const text = plain(html);
  assert.ok(text.includes('One agent session ran for 172.7 hours, about a week. 82 of the 84 pull requests it referenced are merged.'));
  assert.ok(text.includes('From the factory, my public record of agent work, October 2026.'));
  assert.doesNotMatch(html, /factory-longest-sessions|factory-sessions\.jpg/);
  assert.ok(hrefsOf(html).includes('https://ourostack.github.io/factory/'));
});

test('homepage ends with three things to try, each with one action and no broken URL', () => {
  const html = readDist('index.html');
  const text = plain(html);
  assert.ok(text.includes('The five principles, written for your agent to read.'));
  assert.ok(text.includes(`Give your agent this link and say "set this up": Desk's SETUP.md`));
  assert.match(html, /<span id="home-desk-setup" class="sr-only"[^>]*>https:\/\/github\.com\/ourostack\/desk\/blob\/main\/SETUP\.md<\/span>/);
  assert.match(html, /<button type="button" data-copy-target="home-desk-setup"/);
  assert.ok(text.includes('For the Mac.'));
  assert.doesNotMatch(text, /\bfree\b/i, 'No App Store listing says free');
  assert.doesNotMatch(html, /door-arrow/, 'No bare arrows');
  for (const href of ['/brief/', 'https://ouro.bot/apps/ouro-md/', 'https://github.com/ourostack/desk/blob/main/SETUP.md']) assert.ok(hrefsOf(html).includes(href));
});

test('the footer links to mendelow.me', () => {
  const footer = footerOf(readDist('index.html'));
  assert.ok(textOf(footer).includes('More about me: mendelow.me'));
  assert.ok(hrefsOf(footer).includes('https://mendelow.me'));
});

test('no built page or agent file contains a deny-listed string', (t) => {
  const deny = loadDenyList();
  if (!deny) {
    t.skip('Set SITE_DENYLIST or SITE_DENYLIST_FILE to run this check');
    return;
  }
  const files = [...listHtmlFiles(), path.join(distDir, 'brief.md'), path.join(distDir, 'llms.txt')];
  const hits = [];
  for (const file of files) {
    const body = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const entry of deny) if (body.includes(entry.toLowerCase())) hits.push(`${path.relative(distDir, file)}: ${entry}`);
  }
  assert.deepEqual(hits, []);
});

test('homepage links each principle to the approach', () => {
  const hrefs = hrefsOf(readDist('index.html'));
  assert.ok(hrefs.filter((href) => href.startsWith('/approach/#')).length >= 6, 'Each principle links to the approach');
});

test('every page carries the same nav, in order, with the badge as the mark', () => {
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
  assert.ok(html.includes('/brand/ouro-badge.svg'), 'Nav must use the badge mark');
});

test('footer adds privacy, terms and GitHub', () => {
  const footer = footerOf(readDist('index.html'));
  for (const href of ['/privacy/', '/terms/', 'https://github.com/ourostack']) {
    assert.ok(hrefsOf(footer).includes(href), `Footer is missing ${href}`);
  }
});

test('marks stay visible in dark mode', () => {
  // The badge and silhouette paint with currentColor, so they must be drawn
  // through a CSS mask filled with the text colour, never as a bare <img>
  // (which would render black on the dark theme).
  const badge = fs.readFileSync(path.join(process.cwd(), 'public/brand/ouro-badge.svg'), 'utf8');
  assert.match(badge, /currentColor/);
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(distDir, file);
    assert.doesNotMatch(html, /<img\b[^>]*src="\/brand\/ouro-(badge|silhouette)\.svg"/, `${rel} draws a currentColor mark as an <img>`);
    for (const [img] of html.matchAll(/<img\b[^>]*src="\/brand\/desk-icon\.svg"[^>]*>/g)) {
      assert.match(img, /class="[^"]*\bmark-tile\b/, `${rel}: the white Desk tile needs the mark-tile edge`);
    }
  }
  const markUse = readDist('index.html').match(/class="[^"]*\bmark-mask\b[^"]*"[^>]*style="[^"]*\/brand\/ouro-badge\.svg/);
  assert.ok(markUse, 'Badge must render through .mark-mask');

  const css = fs.readdirSync(path.join(distDir, '_astro'))
    .filter((name) => name.endsWith('.css'))
    .map((name) => fs.readFileSync(path.join(distDir, '_astro', name), 'utf8'))
    .join('\n');
  assert.match(css, /\.mark-mask\{[^}]*background(-color)?:currentColor/);
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

test('favicon uses the new character mark', () => {
  assert.match(readDist('index.html'), /<link rel="icon"[^>]*href="\/brand\/ouro-character\.svg"/);
  assert.ok(distExists('brand/ouro-character.svg'));
});

// ── The approach (Ari's approved copy, verbatim) ──

const principleHeadings = [
  'Talk through intent and judgement together',
  'Delegate whole outcomes, not steps',
  'Make context durable',
  'Give agents meaningful authority, with clear boundaries',
  'Verify the actual result, not plausible progress',
];

const approachQuotes = [
  'you need to optimize for small numbers (potentially for long periods) of human collab with me. as in, i can sit here and talk things through with you for as long as is needed, but very few times',
  "i don't care how you do this, so long as it's done as well as possible [...] my judgement will be entirely based on whether or not it works.",
  'you returned control because when you did -rm -rf it prompted me, and i was not here. big sad',
  'need e2e working proof with visual receipts!',
  '36 minutes is insane! what is it doing that takes so long? feels like the correct first question, no?',
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
  assert.equal(h1, 'How I build with agents');
  assert.doesNotMatch(textOf(html), /Here's how I believe it works/);
  assert.ok(hrefsOf(html).includes('/brief/'));
});

test('approach page renders the five principles and the proposed sixth', () => {
  const html = readDist('approach/index.html');
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) => textOf(inner));
  principleHeadings.forEach((heading, i) => {
    assert.ok(headings.includes(`${i + 1}. ${heading}`), `Missing principle heading: ${heading}`);
  });
  assert.ok(headings.includes('+1. Fix the system, not the instance (proposed)'));
  for (const id of ['intent-and-judgement', 'whole-outcomes', 'durable-context', 'authority-and-boundaries', 'verify-the-result', 'fix-the-system']) {
    assert.match(html, new RegExp(`id="${id}"`), `Missing anchor ${id}`);
  }
});

test('approach page quotes Ari verbatim and labels agent notes', () => {
  const html = readDist('approach/index.html');
  const quotes = [...html.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/g)].map(([, inner]) => textOf(inner));
  assert.equal(quotes.length, approachQuotes.length);
  for (const quote of approachQuotes) assert.ok(quotes.includes(quote), `Missing quote: ${quote}`);

  const text = textOf(html);
  assert.equal((text.match(/Agent note\./g) || []).length, 2, 'Agent notes only where they add a fact: principles 3 and 4');
  for (const id of ['durable-context', 'authority-and-boundaries']) {
    const section = html.slice(html.indexOf(`id="${id}"`), html.indexOf('<h2', html.indexOf(`id="${id}"`) + 1));
    assert.match(section, /Agent note\./, `${id} keeps its agent note`);
  }
  const fix = html.slice(html.indexOf('id="fix-the-system"'));
  assert.match(textOf(fix), /CI took 36 minutes, and an agent started designing a way around it\. I asked:/);
  assert.match(textOf(fix), /The cause was coverage instrumentation\. Without it, the same 1,669 tests ran in 39 seconds\./);
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

test('the May essays keep the 2026-05-17 rewrites', () => {
  const ttfa = readDist('blog/trust-the-agent/index.html');
  assert.equal(textOf(ttfa.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), 'Trust the Fucking Agent');
  assert.match(textOf(ttfa), /The country of geniuses is here\. Bring judgement\. They've got the rest\./);
  const seat = readDist('blog/take-the-agents-seat/index.html');
  assert.match(textOf(seat), /The agent is going to read what we wrote\. Read it first\./);
});

test('Stop being the glue is back to its published text', () => {
  const text = textOf(readDist('blog/stop-being-the-glue/index.html'));
  assert.match(text, /That article captures the moment we finally got what Siri promised/);
  assert.match(text, /That's what led to Ouroboros ?: an agent harness designed from scratch/);
  assert.match(text, /The collaboration loop described here became the foundation for something more structural ?\./);
  assert.doesNotMatch(text, /Update, October 2026/);
});

test('every blog post ends with a route to Desk, the factory and the team steps', () => {
  for (const slug of ['stop-being-the-glue', 'designing-with-your-agent', 'what-is-agent-experience', 'trust-the-agent']) {
    const html = readDist(`blog/${slug}/index.html`);
    const end = html.match(/<aside\b[^>]*data-post-end[\s\S]*?<\/aside>/);
    assert.ok(end, `${slug} has no post end`);
    assert.match(textOf(end[0]), /https:\/\/github\.com\/ourostack\/desk\/blob\/main\/SETUP\.md and say "set this up"/);
    assert.ok(hrefsOf(end[0]).includes('https://ourostack.github.io/factory/'));
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
  assert.equal(textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), 'The harness, where all of this started.');
  assert.match(text, /Slugger was my OpenClaw agent/);
  // The harness-first homepage, carried over intact.
  for (const line of ['What survives when the context window runs out?', 'The tail is consumed. The self survives.', 'One command. A conversation. Hatched.', 'Most agents forget who they are between conversations.']) {
    assert.ok(text.includes(line), `Lab is missing "${line}"`);
  }
  for (const provider of ['anthropic', 'openai', 'gemini', 'minimax']) assert.ok(hrefsOf(html).includes(`/lab/model-reviews/${provider}`));
  for (const href of ['/lab/story/', '/lab/why/', '/lab/docs/', '/lab/model-reviews/', '/blog/what-is-agent-experience/', '/blog/build-ai-agent-from-scratch/']) {
    assert.ok(hrefsOf(html).includes(href), `Lab is missing ${href}`);
  }
});

test('the story opens with who Slugger is and ends with where it went', () => {
  const html = readDist('lab/story/index.html');
  const text = textOf(html);
  assert.ok(text.indexOf('Who is Slugger') < text.indexOf('The spark'));
  assert.ok(text.indexOf('What happened next') > text.indexOf('Build the house accordingly'));
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

test('privacy and terms build, are linked from the footer, and say they are drafts', () => {
  for (const page of ['privacy', 'terms']) {
    assert.ok(distExists(`${page}/index.html`), `${page} page is not built`);
    const html = readDist(`${page}/index.html`);
    assert.match(textOf(html), /Draft for review/);
    assert.ok(hrefsOf(footerOf(readDist('index.html'))).includes(`/${page}/`));
  }
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

test('the approach introduces the three acts in Ari\'s words before naming one, and the homepage agrees', () => {
  const acts = "I view this agentic era as three acts: capability, orientation, and work design.";
  for (const file of ['approach/index.html', 'index.html']) {
    const text = textOf(readDist(file));
    assert.ok(text.includes(acts), `${file} is missing the three acts`);
    assert.doesNotMatch(text, /Acts? [23]\b/, `${file} names an act by number`);
    assert.doesNotMatch(text, /solidifying|settling|oriented well enough/);
  }
  const approach = textOf(readDist('approach/index.html'));
  assert.ok(approach.includes('Now the industry is starting to move into the third act'));
  assert.ok(approach.indexOf(acts) < approach.indexOf('+1. Fix the system'));
  assert.match(approach, /Agents pinned about a dozen times anyway/);
  assert.doesNotMatch(approach, /a dozen more times/);
});

test('the May essays say when they were written and when they were published', () => {
  for (const [file, created] of [['blog/trust-the-agent/index.html', '2026-05-14'], ['blog/take-the-agents-seat/index.html', '2026-05-17']]) {
    const ld = JSON.parse(readDist(file).match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"(?:Blog|)?Article"[\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.dateCreated, created, `${file} dateCreated`);
    assert.ok(ld.datePublished > ld.dateCreated, `${file} datePublished must be the release date, not the writing date`);
  }
});
