import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, distExists, readDist, listHtmlFiles } from './support/dist.mjs';
import { sceneFor, ogSceneFor, meadowScene, scenes, productScenes, darkScenes, columnHeroes, columnHeroWidths, COLUMN_HERO_MEDIA, phoneSize } from '../src/data/scenes.mjs';

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

test('every page opens on its scene: AVIF then WebP, the phone crop under 640px, loaded first', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const { hero } = sceneFor(pageOf(file));
    if (!hero) { assert.doesNotMatch(html, /class="story-scene story-hero/, `${pageOf(file)} has no hero scene`); continue; }
    const block = html.match(/<div class="story-scene story-(?:hero|contained)[^"]*"[^>]*>[\s\S]*?<\/picture>/)?.[0];
    assert.ok(block, `${pageOf(file)}: no hero scene`);
    assert.match(block, new RegExp(`data-brand-scene="${hero}"`), pageOf(file));
    const sources = [...block.matchAll(/<source\b[^>]*>/g)].map(([s]) => s);
    assert.match(sources[0], /media="\(max-width: 640px\)[^"]*"[^>]* type="image\/avif" srcset="\/brand\/storybook\/phone\//);
    assert.match(sources[2], /type="image\/avif"/);
    assert.match(sources[3], /type="image\/webp"/);
    const img = block.match(/<img\b[^>]*>/)[0];
    assert.match(img, /fetchpriority="high"/);
    assert.match(img, /width="1536" height="(?:512|576|614)"/);
    assert.doesNotMatch(img, /loading=/, `${pageOf(file)}: the hero is never lazy`);
  }
});

test('a hero with a night version is one picture that fetches only the art for the theme in use', () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const { hero } = sceneFor(pageOf(file));
    const opening = html.match(/<div class="story-scene story-(?:hero|contained)[^"]*"[^>]*>/)?.[0];
    const block = html.match(/<div class="story-scene story-(?:hero|contained)[^"]*"[^>]*>[\s\S]*?<\/div>/)?.[0];
    if (!block) continue;
    const pictures = [...block.matchAll(/<picture\b([^>]*)>([\s\S]*?)<\/picture>/g)];
    assert.equal(pictures.length, 1, `${pageOf(file)}: one hero picture`);
    assert.doesNotMatch(pictures[0][1], /class=/, `${pageOf(file)}: a hero picture has no theme class`);
    const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
    const night = darkScenes[hero];
    if (!night) {
      assert.doesNotMatch(opening, /data-night-scene|--paint-night/, pageOf(file));
      assert.match(opening, /--paint: url\(/, pageOf(file));
      assert.doesNotMatch(block, /<script\b/, `${pageOf(file)}: an ordinary hero needs no script`);
      continue;
    }
    const page = pageOf(file);
    assert.match(opening, new RegExp(`data-night-scene="${night}"`), page);
    // Both paints ride along, and global.css picks one per theme (never --paint inline,
    // which would beat the stylesheet).
    assert.doesNotMatch(opening, /--paint:/, page);
    for (const [name, s] of [['day', hero], ['night', night]]) {
      assert.ok(opening.includes(`--paint-${name}: url(${paints[s].wide.uri})`), `${page}: ${name} paint`);
      assert.ok(opening.includes(`--paint-phone-${name}: url(${paints[s].phone.uri})`), `${page}: ${name} phone paint`);
    }
    // The day art asks for a light color scheme and comes first; the night art takes the rest.
    const sources = [...pictures[0][2].matchAll(/<source\b[^>]*>/g)].map(([t]) => t);
    // Four phone sources, then (column heroes only) four 2:1 column sources from 1600px, then four wide ones.
    // The column art comes ahead of the full-bleed art, so it wins from 1600px and nowhere else.
    // A page hero (PageHero) shows the scene whole in the page's column, so it never takes the column art.
    const column = Boolean(columnHeroes[hero]) && !opening.includes('story-contained');
    const layout = [['phone', '(max-width: 640px)'], ...(column ? [['col', COLUMN_HERO_MEDIA]] : []), ['wide', '']];
    assert.equal(sources.length, layout.length * 4, page);
    sources.forEach((t, i) => {
      const [kind, cond] = layout[Math.floor(i / 4)];
      const light = i % 4 < 2;
      const dir = kind === 'phone' ? 'brand/storybook/phone' : kind === 'col' ? 'images/guide-hero' : 'brand/storybook/scenes';
      const infix = kind === 'col' ? '-col-' : '-';
      assert.match(t, new RegExp(`srcset="/${dir}/${light ? hero : night}${infix}`), `${page}: source ${i}`);
      assert.match(t, new RegExp(`data-theme-art="${light ? 'light' : 'dark'}"`), `${page}: source ${i}`);
      assert.match(t, new RegExp(`type="image/${i % 2 ? 'webp' : 'avif'}"`), `${page}: source ${i} type`);
      const media = t.match(/\smedia="([^"]*)"/)?.[1];
      const want = [cond, light && '(prefers-color-scheme: light)'].filter(Boolean).join(' and ');
      assert.equal(media ?? '', want, `${page}: source ${i} media`);
      assert.equal(t.match(/data-media="([^"]*)"/)?.[1], cond, `${page}: source ${i} data-media`);
    });
    const img = pictures[0][2].match(/<img\b[^>]*>/)[0];
    assert.match(img, new RegExp(`src="/brand/storybook/headers/${night}\\.webp"`));
    assert.match(img, /fetchpriority="high"/);
    assert.doesNotMatch(img, /loading=/);
    assert.ok(img.includes(` alt="${scenes[night]}"`), `${page}: night alt`);
    assert.ok(img.includes(`data-light-alt="${scenes[hero]}"`), `${page}: day alt`);
    // The site's own theme toggle (data-theme) wins over the system's.
    assert.match(block, /<\/picture>\s*<script>[\s\S]*data-theme[\s\S]*not all[\s\S]*<\/script>/, `${page}: no script follows the chosen theme`);
    // Only the theme in use is preloaded: no static hero preload, one chosen in the head.
    assert.doesNotMatch(head, /<link rel="preload" as="image"/, `${page}: a static preload fetches one theme's art for everyone`);
    const preload = head.match(/<script>\(function \(\) \{ var t = document\.documentElement\.dataset\.theme;[\s\S]*?<\/script>/)?.[0];
    assert.ok(preload, `${page}: no theme-aware preload`);
    assert.ok(preload.includes(`/phone/${hero}-384.avif`) && preload.includes(`/scenes/${night}-1536.avif`), page);
    // A column hero's full-bleed preload stops at 1599px, and its column art's takes over from 1600px.
    if (column) {
      assert.ok(preload.includes('(min-width: 641px) and (max-width: 1599px)'), `${page}: the full-bleed preload stops where the column art starts`);
      for (const s of [hero, night]) assert.ok(preload.includes(`/images/guide-hero/${s}-col-3072.avif 3072w`) && preload.includes('72rem'), `${page}: ${s} column preload`);
    }
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
