import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { getModelReviewClaims } from '../src/lib/model-review-claims.mjs';

const distDir = path.join(process.cwd(), 'dist');
const sitemapPath = path.join(distDir, 'sitemap-0.xml');

const routes = [
  ['/', 'index.html'],
  ['/approach/', 'approach/index.html'],
  ['/brief/', 'brief/index.html'],
  ['/desk/', 'desk/index.html'],
  ['/ouro-md/', 'ouro-md/index.html'],
  ['/blog/', 'blog/index.html'],
  ['/blog/trust-the-agent/', 'blog/trust-the-agent/index.html'],
  ['/blog/take-the-agents-seat/', 'blog/take-the-agents-seat/index.html'],
  ['/blog/stop-being-the-glue/', 'blog/stop-being-the-glue/index.html'],
  ['/blog/designing-with-your-agent/', 'blog/designing-with-your-agent/index.html'],
  ['/lab/', 'lab/index.html'],
  ['/lab/docs/', 'lab/docs/index.html'],
  ['/lab/docs/architecture/', 'lab/docs/architecture/index.html'],
  ['/lab/docs/getting-started/', 'lab/docs/getting-started/index.html'],
  ['/lab/story/', 'lab/story/index.html'],
  ['/lab/why/', 'lab/why/index.html'],
  ['/lab/what-is-an-agent-harness/', 'lab/what-is-an-agent-harness/index.html'],
  ['/lab/model-reviews/', 'lab/model-reviews/index.html'],
  ['/lab/model-reviews/anthropic/', 'lab/model-reviews/anthropic/index.html'],
  ['/lab/model-reviews/openai/', 'lab/model-reviews/openai/index.html'],
  ['/lab/model-reviews/gemini/', 'lab/model-reviews/gemini/index.html'],
  ['/lab/model-reviews/minimax/', 'lab/model-reviews/minimax/index.html'],
  ['/blog/build-ai-agent-from-scratch/', 'blog/build-ai-agent-from-scratch/index.html'],
  ['/blog/what-is-agent-experience/', 'blog/what-is-agent-experience/index.html'],
  ['/blog/give-your-agent-a-home/', 'blog/give-your-agent-a-home/index.html'],
  ['/privacy/', 'privacy/index.html'],
  ['/terms/', 'terms/index.html'],
];

function readDistFile(relativePath) {
  return fs.readFileSync(path.join(distDir, relativePath), 'utf8');
}

function extractCanonical(html) {
  const match = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.ok(match, 'Missing canonical link');
  return match[1];
}

function extractOgUrl(html) {
  const match = html.match(/<meta property="og:url" content="([^"]+)"/);
  assert.ok(match, 'Missing og:url meta tag');
  return match[1];
}

test('review claims derive from the data and retain the model count in methodology', () => {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/model-reviews.json'), 'utf8'));
  const claims = getModelReviewClaims(data);

  for (const filePath of ['lab/model-reviews/index.html', 'lab/why/index.html', 'blog/what-is-agent-experience/index.html', 'lab/index.html']) {
    assert.ok(readDistFile(filePath).includes(claims.claimSentence), `Missing shared claim on ${filePath}`);
  }
  const methodology = readDistFile('lab/model-reviews/index.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(methodology.includes(`runs the ${claims.totalReviews} selected models in parallel`));
});

test('start links lead directly to the setup guide', () => {
  for (const [filePath, label] of [
    ['lab/story/index.html', 'start building'],
    ['lab/what-is-an-agent-harness/index.html', 'the serpent guide takes three minutes'],
  ]) {
    const links = [...readDistFile(filePath).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const link = links.find(([, , content]) => content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() === label);
    assert.ok(link, `Missing ${label} link on ${filePath}`);
    assert.equal(link[1], '/lab/docs/getting-started/');
  }
});

test('setup guide provides prerequisites and a copyable command before the demo', () => {
  const html = readDistFile('lab/docs/getting-started/index.html');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /Node\.js 22 or newer/);
  assert.match(html, /href="https:\/\/nodejs\.org\/en\/download\/?"/);
  assert.match(html, /<button\b[^>]*data-prompt="npx ouro\.bot"[^>]*>/);
  assert.match(text, /Open Terminal/i);
  assert.ok(html.indexOf('data-prompt="npx ouro.bot"') < html.indexOf("welcome to ouroboros"));
});

test('each prompt card registers one copy handler, including pages with multiple cards', () => {
  for (const filePath of [
    'lab/docs/index.html',
    'lab/docs/architecture/index.html',
    'lab/docs/bundles-and-psyche/index.html',
    'lab/docs/continuity-and-memory/index.html',
    'lab/docs/getting-started/index.html',
    'lab/docs/skills-and-prompts/index.html',
    'lab/docs/tasks-and-work/index.html',
  ]) {
    const html = readDistFile(filePath);
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .map(([, attributes, inline]) => {
        const source = attributes.match(/\bsrc="\/([^"]+)"/);
        return source ? readDistFile(source[1]) : inline;
      })
      .filter(source => source.includes('.prompt-copy-btn'));
    assert.equal(scripts.length, 1, `Copy script must appear once on ${filePath}`);
    const handlers = [...html.matchAll(/class="prompt-copy-btn\b/g)].map(() => []);
    assert.ok(handlers.length > 0, `Missing prompt cards on ${filePath}`);
    runInNewContext(scripts[0], {
      document: {
        querySelectorAll(selector) {
          assert.equal(selector, '.prompt-copy-btn');
          return handlers.map(list => ({
            addEventListener(event, handler) {
              assert.equal(event, 'click');
              list.push(handler);
            },
          }));
        },
      },
    });
    assert.ok(handlers.every(list => list.length === 1), `Copy handlers must not accumulate on ${filePath}`);
  }
});

test('sitemap emits trailing-slash URLs for sampled routes', () => {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');

  for (const [route] of routes) {
    const expectedUrl = `https://ouroboros.bot${route}`;
    assert.match(sitemap, new RegExp(`<loc>${expectedUrl}</loc>`));
  }
});

test('sampled built pages emit trailing-slash canonical metadata', async (t) => {
  for (const [route, filePath] of routes) {
    await t.test(route, () => {
      const html = readDistFile(filePath);
      const expectedUrl = `https://ouroboros.bot${route}`;

      assert.equal(extractCanonical(html), expectedUrl);
      assert.equal(extractOgUrl(html), expectedUrl);
    });
  }
});

test('review rerun instructions describe private output without relabeling the published experiment', () => {
  const html = readDistFile('lab/model-reviews/index.html');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/model-reviews.json'), 'utf8'));
  const count = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][data.harnesses.length] ?? String(data.harnesses.length);

  assert.match(text, /Results are saved privately/);
  assert.match(text, /do not update this page/);
  assert.doesNotMatch(text, /Output is written to/);
  assert.match(text, new RegExp(`list of ${count} publicly documented agent harnesses`));
  assert.match(text, new RegExp(`expanded the field to ${count} harnesses`));
  assert.doesNotMatch(text, /current script may include candidates added/i);
});

test('review methodology describes the process without editorial disclaimers', () => {
  const html = readDistFile('lab/model-reviews/index.html');
  const methodology = [...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)]
    .find(([, section]) => /<span\b[^>]*>Methodology<\/span>/.test(section));
  assert.ok(methodology, 'Missing methodology section');
  const text = methodology[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  assert.match(text, /We ran an initial comparison/);
  assert.match(text, /repaired repository access for every candidate/);
  assert.match(text, /reran the complete panel/);
  assert.match(text, /results and transcripts from that run are shown here/i);
  assert.match(text, /Every review uses the same research tools and Copilot CLI runtime/);
  assert.match(text, /Research context/);
  assert.match(text, /Source records/);
  assert.match(text, /Research process/);
  assert.match(text, /Automatic context compaction and large-output file indirection are disabled/);
  assert.match(text, /exact prefixes of up to 500 characters with their model-visible length and SHA-256 hash/);
  assert.doesNotMatch(text, /one-shot benchmark|not independently controlled|No Ouroboros product code changed|dissenting vote|No hidden summary|not source mirror|rejected rather than published|without republishing/i);
});

test('rerun instructions offer API-only inference without a required Copilot subscription', () => {
  const html = readDistFile('lab/model-reviews/index.html');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /--inference direct-api/);
  assert.match(text, /--inference copilot-first/);
  assert.match(text, /Direct API mode is the default/);
  assert.match(text, /no Copilot account or subscription/);
  assert.match(text, /ANTHROPIC_API_KEY/);
  assert.match(text, /OPENAI_API_KEY/);
  assert.doesNotMatch(text, /Use Node 22 and authenticate with a Copilot subscription/);
  assert.match(text, /bundled.*runtime/);
});

test('Agent Experience article derives the reviewed harness count from the accepted data', () => {
  const html = readDistFile('blog/what-is-agent-experience/index.html');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/model-reviews.json'), 'utf8'));

  assert.match(text, new RegExp(`research the ${data.harnesses.length} selected agent harnesses`));
});

test('the sitemap has no docs or model-review URL outside the Lab, and no /essays/', () => {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
  assert.ok(locs.length > 10, 'Sitemap looks empty');
  const stray = locs.filter((p) => /^\/(essays|docs|model-reviews|story|why|what-is-an-agent-harness)(\/|$)/.test(p));
  assert.deepEqual(stray, []);
});

test('every internal link resolves to a built file', () => {
  const isBuilt = (pathname) => {
    const clean = decodeURIComponent(pathname);
    const candidates = clean.endsWith('/') ? [path.join(clean, 'index.html')] : [clean, path.join(clean, 'index.html')];
    return candidates.some((c) => {
      const full = path.join(distDir, c);
      return fs.existsSync(full) && fs.statSync(full).isFile();
    });
  };
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
  const broken = [];
  for (const file of walk(distDir)) {
    const rel = path.relative(distDir, file);
    const html = fs.readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
      if (href.startsWith('#') || href.startsWith('mailto:')) continue;
      const url = new URL(href.replace(/&amp;/g, '&'), `https://ouroboros.bot/${rel}`);
      if (url.host !== 'ouroboros.bot') continue;
      if (!isBuilt(url.pathname)) broken.push(`${rel} -> ${href}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('old URLs redirect to their new homes and published posts keep theirs', async () => {
  const { redirectFor } = await import('../src/worker/redirects.mjs');
  const cases = [
    ['/docs/getting-started/', '/lab/docs/getting-started/'],
    ['/docs', '/lab/docs/'],
    ['/model-reviews/anthropic/', '/lab/model-reviews/anthropic/'],
    ['/story', '/lab/story/'],
    ['/why', '/lab/why/'],
    ['/what-is-an-agent-harness/', '/lab/what-is-an-agent-harness/'],
    ['/essays/', '/blog/'],
    ['/essays/trust-the-agent', '/blog/trust-the-agent/'],
    ['/lab/what-is-agent-experience/', '/blog/what-is-agent-experience/'],
  ];
  for (const [from, to] of cases) {
    assert.equal(redirectFor(from), to, `${from} should go to ${to}`);
    assert.ok(fs.existsSync(path.join(distDir, to, 'index.html')), `Redirect target ${to} is not built`);
  }
  // The URLs the Desk RFC and old shares point at are served directly.
  for (const post of ['/blog/', '/blog/stop-being-the-glue/', '/blog/designing-with-your-agent/', '/blog/what-is-agent-experience/', '/blog/build-ai-agent-from-scratch/']) {
    assert.equal(redirectFor(post), null, `${post} must not redirect`);
    assert.ok(fs.existsSync(path.join(distDir, post, 'index.html')), `${post} is not built`);
  }
  assert.equal(redirectFor('/docs/skills/manifest.json'), '/lab/docs/skills/manifest.json', 'File paths keep their name');
  assert.equal(redirectFor('/approach/'), null);
  assert.equal(redirectFor('/lab/docs/'), null);
});

test('the worker answers an old URL with a 301 that keeps the query string', async () => {
  const { redirectResponse } = await import('../src/worker/redirects.mjs');
  const res = redirectResponse(new Request('https://ouroboros.bot/docs?utm_source=x'));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://ouroboros.bot/lab/docs/?utm_source=x');
  const odd = redirectResponse(new Request('https://ouroboros.bot/docs//evil.com'));
  assert.equal(new URL(odd.headers.get('location')).host, 'ouroboros.bot', 'No open redirect');
  assert.equal(redirectResponse(new Request('https://ouroboros.bot/approach/')), null);
});
