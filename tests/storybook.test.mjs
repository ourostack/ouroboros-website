import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, distExists, readDist, listHtmlFiles } from './support/dist.mjs';
import { sceneFor, ogSceneFor, meadowScene, scenes, productScenes, darkScenes } from '../src/data/scenes.mjs';

// The storybook world (Ari, 2026-11-06). The art is ourostack/.github brand/,
// copied byte for byte by scripts/sync-storybook.mjs; the brand audit fetches
// /brand/storybook/<path> and compares it with brand/provenance.json.

const provenance = JSON.parse(fs.readFileSync(new URL('../public/brand/storybook/provenance.json', import.meta.url), 'utf8'));
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pageOf = (file) => `/${path.relative(distDir, file).replace(/index\.html$/, '').replace(/\.html$/, '')}`;
const pages = () => listHtmlFiles().filter((file) => !/http-equiv="refresh"/.test(fs.readFileSync(file, 'utf8')));

test('every storybook file is served with exactly its provenance bytes, and nothing else is', () => {
  const listed = new Set(provenance.map((entry) => entry.file));
  for (const entry of provenance) {
    const file = path.join(distDir, 'brand/storybook', entry.file);
    assert.ok(fs.existsSync(file), `${entry.file} is not served`);
    assert.equal(sha(file), entry.sha256, `${entry.file} was re-encoded`);
  }
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  for (const file of walk(path.join(distDir, 'brand/storybook'))) {
    const rel = path.relative(path.join(distDir, 'brand/storybook'), file);
    if (rel !== 'provenance.json') assert.ok(listed.has(rel), `${rel} is not in provenance.json`);
  }
});

test('every page opens on its scene: AVIF then WebP, the phone crop under 640px, loaded first', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const { hero } = sceneFor(pageOf(file));
    if (!hero) { assert.doesNotMatch(html, /class="story-scene story-hero/, `${pageOf(file)} has no hero scene`); continue; }
    const block = html.match(/<div class="story-scene story-hero[^"]*"[^>]*>[\s\S]*?<\/picture>/)?.[0];
    assert.ok(block, `${pageOf(file)}: no hero scene`);
    assert.match(block, new RegExp(`data-brand-scene="${hero}"`), pageOf(file));
    const sources = [...block.matchAll(/<source\b[^>]*>/g)].map(([s]) => s);
    assert.match(sources[0], /media="\(max-width: 640px\)" type="image\/avif" srcset="\/brand\/storybook\/phone\//);
    assert.match(sources[2], /type="image\/avif"/);
    assert.match(sources[3], /type="image\/webp"/);
    const img = block.match(/<img\b[^>]*>/)[0];
    assert.match(img, /fetchpriority="high"/);
    assert.match(img, /width="1536" height="(?:512|576|614)"/);
    assert.doesNotMatch(img, /loading=/, `${pageOf(file)}: the hero is never lazy`);
  }
});

test('a hero with a night version shows each in its own theme, both loaded first; no other hero has two', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const { hero } = sceneFor(pageOf(file));
    const block = html.match(/<div class="story-scene story-hero[^"]*"[^>]*>[\s\S]*?<\/div>/)?.[0];
    if (!block) continue;
    const pictures = [...block.matchAll(/<picture\b([^>]*)>([\s\S]*?)<\/picture>/g)];
    if (!darkScenes[hero]) {
      assert.equal(pictures.length, 1, `${pageOf(file)}: one hero picture`);
      assert.doesNotMatch(pictures[0][1], /class=/, `${pageOf(file)}: an ordinary hero has no theme class`);
      continue;
    }
    assert.deepEqual(pictures.map(([, attrs]) => attrs.trim()), ['class="theme-light-only"', 'class="theme-dark-only"'], pageOf(file));
    for (const [[, , inner], scene] of pictures.map((p, i) => [p, i ? darkScenes[hero] : hero])) {
      assert.match(inner, new RegExp(`srcset="/brand/storybook/phone/${scene}-384\\.avif`), `${pageOf(file)}: ${scene}`);
      const img = inner.match(/<img\b[^>]*>/)[0];
      assert.match(img, new RegExp(`src="/brand/storybook/headers/${scene}\\.webp"`));
      assert.match(img, /fetchpriority="high"/);
      assert.doesNotMatch(img, /loading=/);
      assert.ok(img.includes(`alt="${scenes[scene]}"`), `${pageOf(file)}: ${scene} alt`);
    }
  }
  assert.deepEqual(Object.keys(darkScenes), ['agent-workbench'], 'only the agent loop guide has a night hero');
});

test('scenes further down wait for the arrival, and no page shows one scene twice', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const used = [...html.matchAll(/data-brand-scene="([^"]+)"/g)].map(([, s]) => s);
    assert.equal(new Set(used).size, used.length, `${pageOf(file)} repeats a scene: ${used}`);
    for (const [block] of html.matchAll(/<div class="story-scene story-(?:inline|meadow|vignette)[\s\S]*?<\/picture>/g)) {
      // The meadow above the footer is marked "far": it starts loading a few
      // screens ahead, so a quick scroll to the foot never meets an empty band.
      assert.match(block, block.includes('story-meadow') ? /<picture data-defer="far">/ : /<picture data-defer>/);
      assert.doesNotMatch(block, /\ssrcset=|<img\b[^>]*\ssrc=/, 'a deferred scene names no source the preload scanner could fetch');
      assert.match(block.match(/<img\b[^>]*>/)[0], /loading="lazy" decoding="async"/);
    }
  }
});

test('the products show their own scenes on the shelf and on the homepage', () => {
  const apps = readDist('apps/index.html');
  for (const id of ['ouroboros', 'shepherd', 'ouro-hx', 'desk', 'butler']) {
    assert.match(apps, new RegExp(`<li id="${id}"[^>]*>\\s*<div class="story-scene story-inline[^"]*" data-brand-scene="${id}"`));
  }
  assert.match(apps, /data-brand-scene="ouro-md"/);
  const home = readDist('index.html');
  for (const scene of ['ourostack', 'ouroboros', 'friends', 'shepherd', 'butler', 'factory', meadowScene]) assert.match(home, new RegExp(`data-brand-scene="${scene}"`));
});

test('the 404 finds Ouro off the trail, by the gate, with signposts home', () => {
  const html = readDist('404.html');
  assert.match(html, /story-hero" data-brand-scene="ouroboros-website"/);
  assert.doesNotMatch(html, /story-meadow/);
  assert.match(html, /garden gate/);
  assert.match(html, /class="signpost/);
});

test('every page has the Ouro favicon bytes, the touch icon and a manifest', () => {
  const canonical = provenance.find((e) => e.file === 'icons/ouro.svg').sha256;
  assert.equal(sha(path.join(distDir, 'brand/ouro.svg')), canonical);
  const manifest = JSON.parse(readDist('manifest.webmanifest'));
  assert.deepEqual(manifest.icons.filter((i) => i.type === 'image/png').map((i) => [i.src, i.sizes]), [['/brand/storybook/icons/ouro-192.png', '192x192'], ['/brand/storybook/icons/ouro-512.png', '512x512']]);
  for (const icon of manifest.icons) assert.ok(distExists(icon.src.slice(1)), icon.src);
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<link rel="apple-touch-icon" href="\/brand\/storybook\/icons\/ouro-180\.png">/, pageOf(file));
    assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/, pageOf(file));
  }
});

test('every scene has words for people who cannot see it', () => {
  for (const [scene, alt] of Object.entries(scenes)) assert.ok(alt.length > 40 && /Ouro/.test(alt), scene);
});

// Taste review r3 (2026-11-06): 24 scenes for about 37 pages, so some reuse is
// unavoidable, but never next door. No hero scene repeats between pages one
// click apart (a link in the page body), between a page and its parent, or
// between siblings; and a page linked from the nav or the footer, which is one
// click from every page, shares its scene with no other page.
test('no hero scene repeats between neighbouring pages', () => {
  const heroOf = new Map();
  const linksOf = new Map();
  for (const file of pages()) {
    const route = pageOf(file);
    if (route === '/404') continue;
    const { hero } = sceneFor(route);
    if (!hero) continue;
    heroOf.set(route, hero);
    const body = fs.readFileSync(file, 'utf8').replace(/<nav\b[\s\S]*?<\/nav>/g, '').replace(/<footer\b[\s\S]*?<\/footer>/, '');
    linksOf.set(route, new Set([...body.matchAll(/href="(\/[^"#?]*)"/g)].map(([, href]) => (href.endsWith('/') ? href : `${href}/`))));
  }
  const parentOf = (route) => (route === '/' ? null : route.replace(/[^/]+\/$/, ''));
  const html = readDist('index.html');
  // The family bar, the nav and the footer are on every page.
  const chrome = [...html.matchAll(/<nav\b[\s\S]*?<\/nav>/g)].map(([nav]) => nav).join('') + html.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  const everywhere = new Set(['/', ...[...chrome.matchAll(/href="(\/[^"#?]*)"/g)].map(([, href]) => href)]);
  // Two pages of one product share its scene on purpose (Ari's ruling on
  // taste review r19): the download page is the product's front door.
  const productOf = (route) => Object.keys(productScenes).find((p) => route === `${p}/` || route.startsWith(`${p}/`));
  const clashes = [];
  const routes = [...heroOf.keys()];
  for (const a of routes) {
    for (const b of routes) {
      if (a >= b || heroOf.get(a) !== heroOf.get(b)) continue;
      if (productOf(a) && productOf(a) === productOf(b) && heroOf.get(a) === productScenes[productOf(a)]) continue;
      const why = everywhere.has(a) || everywhere.has(b) ? 'nav or footer'
        : linksOf.get(a).has(b) || linksOf.get(b).has(a) ? 'one click'
        : parentOf(a) === b || parentOf(b) === a ? 'parent'
        : parentOf(a) === parentOf(b) && parentOf(a) !== '/' ? 'siblings' : null;
      if (why) clashes.push(`${a} and ${b} (${why}): ${heroOf.get(a)}`);
    }
  }
  assert.deepEqual(clashes, []);
});

// Ari's ruling on taste review r19: /ouro-md/download/ opened on the copper
// still from a tutorial while its card showed Ouro MD's lectern. Every page of
// a product (the product page, its download page, any /<product>/* page)
// opens on that product's own scene and sets its share card in it.
test("a product's pages open on its own scene, hero and share card alike", () => {
  const seen = [];
  for (const file of pages()) {
    const route = pageOf(file);
    const product = Object.keys(productScenes).find((p) => route === `${p}/` || route.startsWith(`${p}/`));
    if (!product) continue;
    const scene = productScenes[product];
    seen.push(route);
    const html = fs.readFileSync(file, 'utf8');
    assert.equal(sceneFor(route).hero, scene, `${route} hero`);
    assert.equal(ogSceneFor(route), scene, `${route} share card`);
    assert.match(html, new RegExp(`<div class="story-scene story-hero[^"]*" data-brand-scene="${scene}"`), `${route} renders its product's hero`);
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    const tw = html.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1];
    assert.ok(og && og === tw, `${route} og:image and twitter:image agree`);
  }
  assert.ok(seen.includes('/ouro-md/download/') && seen.includes('/ouro-md/'), seen.join(' '));
});

// A painted placeholder behind every scene (taste review r10, 2026-11-06: a
// brief Cloudflare 503 left /apps/'s hero showing alt text on a beige box).
// Each scene carries a tiny soft preview of its own art, painted from the
// bytes it serves (scripts/scene-paint.mjs), and a failed image steps aside.
const paints = JSON.parse(fs.readFileSync(new URL('../src/data/scene-paint.json', import.meta.url), 'utf8'));

test('every scene paint comes from the art the site serves now, and stays tiny', () => {
  for (const [scene, paint] of Object.entries(paints)) {
    for (const kind of ['wide', 'phone']) {
      const { from, sha256, uri } = paint[kind];
      assert.equal(sha(path.join(distDir, 'brand/storybook', from)), sha256, `${scene} ${kind} paint is stale: run node scripts/scene-paint.mjs`);
      assert.match(uri, /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/);
      assert.ok(uri.length < 600, `${scene} ${kind} paint is ${uri.length} characters`);
    }
  }
});

test('every scene on every page is painted with its own dawn behind the art', () => {
  let count = 0;
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, scene, night, style] of html.matchAll(/<div class="story-scene[^"]*"[^>]*data-brand-scene="([^"]+)"(?: data-night-scene="([^"]+)")?[^>]*style="([^"]*)"/g)) {
      // A hero with a night version carries both paints; global.css picks one per theme.
      for (const [s, suffix] of night ? [[scene, '-day'], [night, '-night']] : [[scene, '']]) {
        assert.ok(paints[s], `${pageOf(file)}: ${s} has no paint`);
        assert.ok(style.includes(`--paint${suffix}: url(${paints[s].wide.uri})`), `${pageOf(file)}: ${s} is not painted with its wide art`);
        assert.ok(style.includes(`--paint-phone${suffix}: url(${paints[s].phone.uri})`), `${pageOf(file)}: ${s} is not painted with its phone crop`);
      }
      count++;
    }
    // A failed scene image falls back to a smaller size, and steps aside for
    // the paint only when every size has failed (Layout.astro's head script;
    // taste review r12). scripts/image-fallback.mjs proves it in a browser.
    if (/class="story-scene/.test(html)) {
      assert.match(html, /addEventListener\('error', function \(e\) \{\s+var img = e\.target[\s\S]{0,400}closest\('\.story-scene'\)/, `${pageOf(file)} has no failed-image handler`);
      assert.match(html, /c\.f === 'webp' && c\.w === 960[\s\S]{0,300}if \(!next\) \{ img\.setAttribute\('data-failed', ''\); return; \}/, `${pageOf(file)}: the failed-image handler does not step down to the 960 WebP before the paint`);
    }
  }
  assert.ok(count > 60, `only ${count} scenes checked`);
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.story-scene \{ background: var\(--paint, none\)/);
  assert.match(css, /\.story-scene img \{ border: 0; color: transparent; \}/);
  assert.match(css, /\.story-scene img\[data-failed\] \{ visibility: hidden; \}/);
});
