import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, distExists, readDist, listHtmlFiles } from './support/dist.mjs';
import { sceneFor, ogSceneFor, meadowScene, scenes, productScenes, darkScenes, columnHeroes, columnHeroWidths, phoneSize } from '../src/data/scenes.mjs';

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

// Reads a WebP's canvas size from its header: VP8X, lossy VP8 or lossless VP8L.
function webpSize(file) {
  const b = fs.readFileSync(file);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  throw new Error(`${file}: not a WebP`);
}

test('every phone crop is the size the phone hero box is drawn at, so the art is never stretched or cropped again', () => {
  const dir = path.join('public', 'brand', 'storybook', 'phone');
  const crops = fs.readdirSync(dir).filter((f) => f.endsWith('-768.webp'));
  assert.ok(crops.length > 10);
  for (const f of crops) {
    const scene = f.replace(/-768\.webp$/, '');
    assert.deepEqual(webpSize(path.join(dir, f)), phoneSize(scene), `${scene}: phoneSizes in src/data/scenes.mjs must match the crop .github serves`);
  }
});

// Every page opens on Ouro HX's Hero (PageHero.astro) with picture={{ light, dark }}:
// two <picture data-scheme> twins, shown by the Hero's dark: variant, which follows
// the .dark class Layout.astro's pre-paint script mirrors from data-theme and the system.
const heroPictures = (html) => {
  const media = html.match(/<header\b[^>]*data-ouro="hero"[\s\S]*?<div data-slot="media"[\s\S]*?<\/header>/)?.[0];
  if (!media) return null;
  return Object.fromEntries([...media.matchAll(/<picture data-scheme="(light|dark)"([^>]*)>([\s\S]*?)<\/picture>/g)].map(([, scheme, attrs, body]) => [scheme, { attrs, body }]));
};

test('every page opens on its scene: AVIF then WebP, the phone crop under 640px, loaded first', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const page = pageOf(file);
    const { hero } = sceneFor(page);
    if (!hero) { assert.doesNotMatch(html, /data-scheme="light"/, `${page} has no hero scene`); continue; }
    const pictures = heroPictures(html);
    assert.ok(pictures, `${page}: no hero picture`);
    for (const [scheme, scene] of [['light', hero], ['dark', darkScenes[hero]]]) {
      const { body } = pictures[scheme];
      const sources = [...body.matchAll(/<source\b[^>]*>/g)].map(([s]) => s);
      assert.equal(sources.length, 4, `${page} ${scheme}`);
      sources.forEach((s, i) => {
        const dir = i < 2 ? 'phone' : 'scenes';
        assert.match(s, new RegExp(`srcSet="/brand/storybook/${dir}/${scene}-`), `${page} ${scheme} source ${i}`);
        assert.match(s, new RegExp(`type="image/${i % 2 ? 'webp' : 'avif'}"`), `${page} ${scheme} source ${i}`);
        assert.equal(s.match(/\smedia="([^"]*)"/)?.[1], i < 2 ? '(max-width: 640px)' : undefined, `${page} ${scheme} source ${i} media`);
      });
      const img = body.match(/<img\b[^>]*>/)[0];
      assert.match(img, new RegExp(`src="/brand/storybook/headers/${scene}\\.webp"`), `${page} ${scheme}`);
      assert.match(img, /fetchPriority="high"/i, `${page} ${scheme}`);
      assert.match(img, /width="1536" height="(?:512|576|614)"/, `${page} ${scheme}`);
      assert.ok(img.includes(` alt="${scenes[scene]}"`), `${page}: ${scheme} alt`);
    }
    // Both twins render lazy so the hidden one never loads; the Hero's inline script
    // makes the shown one eager before the parser reaches the next tag.
    assert.match(html, /<\/picture><script>\(function\(s\)\{[\s\S]{0,300}g\.loading="eager"[\s\S]{0,40}<\/script>/, `${page}: the shown twin is not made eager`);
  }
});

test('a hero with a night version fetches only the art for the theme in use', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const page = pageOf(file);
    const { hero } = sceneFor(page);
    const pictures = heroPictures(html);
    if (!pictures) continue;
    const night = darkScenes[hero];
    assert.ok(night, `${page}: every hero has a night twin`);
    assert.match(pictures.light.attrs, /class="[^"]*\bdark:hidden\b/, page);
    assert.match(pictures.dark.attrs, /class="[^"]*\bhidden dark:block\b/, page);
    // The Hero's dark: variant follows .dark, so the pre-paint script sets it from the
    // site's own toggle (data-theme) first and the system's setting second.
    const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
    assert.match(head, /classList\.toggle\('dark'/, `${page}: .dark is not set before paint`);
    // Only the theme in use is preloaded: no static hero preload, one chosen in the head.
    assert.doesNotMatch(head, /<link rel="preload" as="image"/, `${page}: a static preload fetches one theme's art for everyone`);
    const preload = head.match(/<script>\(function \(\) \{ var t = document\.documentElement\.dataset\.theme;[\s\S]*?<\/script>/)?.[0];
    assert.ok(preload, `${page}: no theme-aware preload`);
    assert.ok(preload.includes(`/phone/${hero}-384.avif`) && preload.includes(`/scenes/${night}-1536.avif`), page);
  }
  assert.deepEqual(Object.keys(darkScenes).sort(), ['agent-workbench', 'apple-distribution-kit', 'butler', 'desk', 'factory', 'flow-review', 'friends', 'friends-relay', 'gatefold', 'housesitter', 'm365crawl', 'ouro-apps-site', 'ouro-md', 'ouro-native-apple-app-shell', 'ouro-ui-apple', 'ouro-ui-core', 'ouro-work', 'ouro-workbench', 'ouroboros', 'ouroboros-skills', 'ouroboros-website', 'ourostack', 'playwright-focus-proof', 'shepherd'], 'every night hero is listed');
});

test('a column hero\'s art is the guide\'s own master, upscaled and cropped, and is at least as wide as the column is drawn at 2x', () => {
  const brand = new Map(JSON.parse(readDist('brand/storybook/provenance.json')).map((e) => [e.file, e]));
  const by = new Map(JSON.parse(readDist('images/guide-hero/provenance.json')).map((e) => [e.file, e]));
  assert.deepEqual(Object.keys(columnHeroes), ['agent-workbench']);
  assert.equal(Math.max(...columnHeroWidths), 3072, 'the 72rem column at 2x on a 4K screen is 2304px; the widest file has room above it');
  for (const hero of Object.keys(columnHeroes)) {
    for (const [scene, header] of [[hero, `headers/${hero}.webp`], [darkScenes[hero], `headers/${darkScenes[hero]}.webp`]]) {
      for (const w of columnHeroWidths) for (const ext of ['avif', 'webp']) {
        const e = by.get(`${scene}-col-${w}.${ext}`);
        assert.ok(e, `${scene} ${w} ${ext} is in provenance`);
        assert.equal(e.width, w);
        assert.equal(e.height, w / 2, 'the column art is 2:1');
        assert.equal(e.derivedFrom.file, header);
        assert.equal(e.master_sha256, brand.get(header).generation[0].master_sha256, `${scene}: the column art names the hero's own master`);
        assert.match(e.master, /^agent-workbench-(light|dark)-master$/);
        assert.equal(e.upscale, 'Real-ESRGAN x4');
        assert.match(e.approval, /^Ari chose hero option A, 2026-11-12/);
        const bytes = fs.readFileSync(new URL(`../dist/images/guide-hero/${e.file}`, import.meta.url));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), e.sha256, `${e.file} is served with exactly its provenance bytes`);
      }
    }
  }
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
  for (const scene of ['ourostack', 'ouroboros', 'friends', 'shepherd', 'butler', 'factory', meadowScene]) {
    assert.ok(new RegExp(`data-brand-scene="${scene}"`).test(home) || heroPictures(home)?.light.body.includes(`/headers/${scene}.webp"`), `the homepage shows ${scene}`);
  }
});

test('the 404 finds Ouro off the trail, by the gate, with signposts home', () => {
  const html = readDist('404.html');
  assert.match(html, /data-ouro="hero"[\s\S]*?<picture data-scheme="light"[\s\S]*?\/headers\/ouroboros-website\.webp"[\s\S]*?<picture data-scheme="dark"[\s\S]*?\/headers\/ouroboros-website-dark\.webp"/);
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
    assert.ok(heroPictures(html)?.light.body.includes(`/headers/${scene}.webp"`), `${route} renders its product's hero`);
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
      assert.match(html, /addEventListener\('error', function \(e\) \{\s+var img = e\.target[\s\S]{0,400}closest\('\.story-scene, \[data-ouro="hero"\] \[data-slot="media"\]'\)/, `${pageOf(file)} has no failed-image handler`);
      assert.match(html, /c\.f === 'webp' && c\.w === 960[\s\S]{0,300}if \(!next\) \{ img\.setAttribute\('data-failed', ''\); return; \}/, `${pageOf(file)}: the failed-image handler does not step down to the 960 WebP before the paint`);
    }
  }
  assert.ok(count > 0, `only ${count} scenes checked`);
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.story-scene \{ background: var\(--paint, none\)/);
  assert.match(css, /\.story-scene img \{ border: 0; color: transparent; \}/);
  assert.match(css, /\.story-scene img\[data-failed\], \[data-ouro="hero"\] \[data-slot="image"\]\[data-failed\] \{ visibility: hidden; \}/);
});
