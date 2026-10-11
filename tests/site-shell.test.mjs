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

test('homepage asks the question, answers in one line and opens three doors above the origin', () => {
  const html = readDist('index.html');
  const h1 = textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
  assert.equal(h1, 'How do you effectively collaborate with agents?');

  const text = textOf(html);
  assert.match(text, /Talk it through once, hand over the whole job, write down what matters, and check the real result\./);
  const doors = ['href="/approach/"', 'href="/desk/"', 'href="/lab/"'].map((d) => html.indexOf(d, html.indexOf('aria-label="Start here"')));
  assert.ok(doors.every((i) => i > 0), 'Missing a door');
  assert.ok(Math.max(...doors) < html.indexOf('id="origin-heading"'), 'The three doors come before the origin');

  assert.match(text, /doing it by hand/i);
  assert.match(text, /teaching it twice/i);
  assert.match(text, /control keeps coming back to you/i);
  assert.match(text, /between Acts 2 and 3/);

  // The model-review vote is evidence further down, not the headline.
  assert.ok(!h1.includes('All frontier models tested chose'));
});

test('homepage gives Slugger and the harness a real place, in Ari\'s words from the story', () => {
  const html = readDist('index.html');
  const text = textOf(html);
  assert.match(text, /It started with Slugger\./);
  const story = textOf(readDist('lab/story/index.html'));
  for (const quote of ['I set up OpenClaw on a spare MacBook at home. Named my agent Slugger.', 'Then the seams started showing.', 'Then I followed my own guide.']) {
    assert.ok(text.includes(quote), `Homepage is missing "${quote}"`);
    assert.ok(story.includes(quote), `"${quote}" is not verbatim from the story`);
  }
  assert.ok(hrefsOf(html).includes('/lab/story/'));
  assert.ok(hrefsOf(html).includes('/lab/model-reviews/'));
});

test('homepage shows the factory evidence as a real screenshot and links the RFC', () => {
  const html = readDist('index.html');
  assert.match(textOf(html), /69 hours in one session\. 50 of 53 pull requests merged\./);
  assert.match(html, /<img\b[^>]*src="\/images\/factory-sessions\.jpg"[^>]*alt="[^"]{40,}"/);
  assert.ok(distExists('images/factory-sessions.jpg'));
  assert.ok(hrefsOf(html).includes('https://ourostack.github.io/factory/'));
  assert.ok(hrefsOf(html).includes('https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'));
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
  assert.equal(h1, 'How I collaborate with agents');
  assert.doesNotMatch(textOf(html), /Here's how I believe it works/);
  assert.ok(hrefsOf(html).includes('/brief/'));
});

test('approach page renders the five principles and the proposed sixth', () => {
  const html = readDist('approach/index.html');
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) => textOf(inner));
  principleHeadings.forEach((heading, i) => {
    assert.ok(headings.includes(`${i + 1}. ${heading}`), `Missing principle heading: ${heading}`);
  });
  assert.ok(headings.includes('Into Act 3: fix the system, not the instance (proposed)'));
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
  assert.equal((text.match(/Agent note\./g) || []).length, 6, 'Six agent notes, each labelled');
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
  assert.ok(text.indexOf('Who is Slugger, and what came out of this') < text.indexOf('The spark'));
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

test('the approach uses one word for where Act 2 stands', () => {
  const approach = textOf(readDist('approach/index.html'));
  assert.doesNotMatch(approach, /solidifying/);
  assert.match(approach, /settling/);
});

test('the May essays say when they were written and when they were published', () => {
  for (const [file, created] of [['blog/trust-the-agent/index.html', '2026-05-14'], ['blog/take-the-agents-seat/index.html', '2026-05-17']]) {
    const ld = JSON.parse(readDist(file).match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"(?:Blog|)?Article"[\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.dateCreated, created, `${file} dateCreated`);
    assert.ok(ld.datePublished > ld.dateCreated, `${file} datePublished must be the release date, not the writing date`);
  }
});
