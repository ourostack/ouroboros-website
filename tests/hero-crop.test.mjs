import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, listHtmlFiles } from './support/dist.mjs';
import { castFoot, heroFocus, heroFrame, footInHero, FOOT_ROOM, PRODUCT_FLOOR, sceneFor } from '../src/data/scenes.mjs';

// No desktop hero crops more than about a fifth of its scene away (taste
// review r8, 2026-11-06: the legal pages' short band and ouro.bot's capped
// Ouro MD hero cut Ouro's body off at 1024, 1440 and 1920). The box is
// object-fit: cover at the full width, so the share of the art it shows is its
// height over the art's own height at that width. This reads the shipped
// max-height rules from global.css and each page's own --hero-floor and
// --hero-arh, and evaluates them at each laptop and desktop viewport.
// scripts/hero-crop.mjs measures the same thing in a real browser. A product
// page may crop to PRODUCT_FLOOR where its cast allows (Ari, 2026-11-09: room
// under the hero for the product's name), never through the cast.

const MAX_CROP = 0.2;
const routeOfFile = (file) => '/' + path.relative(distDir, file).replace(/index\.html$/, '').replace(/\.html$/, '');
const maxCropFor = (file) => (sceneFor(routeOfFile(file)).product ? 1 - PRODUCT_FLOOR : MAX_CROP);
const viewports = [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

const ruleFor = (selector) => {
  const at = css.indexOf(`${selector} { `);
  assert.ok(at >= 0, `global.css has no "${selector}" rule`);
  const body = css.slice(at, css.indexOf('}', at));
  return body.match(/max-height:\s*([^;]+);/)?.[1];
};
const heroCap = ruleFor('.story-hero img');
const contentCap = ruleFor('.story-hero-content img');

// Evaluates a CSS length expression (max/min/calc over px, rem, vw, vh and the
// two custom properties) to pixels.
function px(expr, { w, h, floor, arh }) {
  const js = expr
    .replace(/var\(--hero-floor,\s*[\d.]+\)/g, String(floor))
    .replace(/var\(--hero-arh,\s*[\d.]+\)/g, String(arh))
    .replace(/([\d.]+)vw/g, (_, n) => `(${n}*${w}/100)`)
    .replace(/([\d.]+)vh/g, (_, n) => `(${n}*${h}/100)`)
    .replace(/([\d.]+)rem/g, (_, n) => `(${n}*16)`)
    .replace(/([\d.]+)px/g, '$1')
    .replace(/\bcalc\(/g, '(');
  assert.match(js, /^[\d.\s()+\-*/,a-z]+$/, `unexpected CSS in ${expr}`);
  return Function('max', 'min', `return ${js}`)(Math.max, Math.min);
}

const pages = () => listHtmlFiles().filter((file) => !/http-equiv="refresh"/.test(fs.readFileSync(file, 'utf8')));

test('global.css caps every desktop hero by the page\'s own floor', () => {
  for (const cap of [heroCap, contentCap]) assert.match(cap, /var\(--hero-floor/, cap);
});

test('no desktop hero crops more than 20% of its scene at 1024, 1440 or 1920', () => {
  let checked = 0;
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const hero = html.match(/<div class="story-scene story-hero([^"]*)"[^>]*style="([^"]*)"/);
    if (!hero) continue;
    const floor = Number(hero[2].match(/--hero-floor:\s*([\d.]+)/)?.[1]);
    const arh = Number(hero[2].match(/--hero-arh:\s*([\d.]+)/)?.[1]);
    assert.ok(floor > 0 && arh > 0, `${file}: the hero has no --hero-floor or --hero-arh`);
    const cap = /story-hero-content/.test(hero[1]) ? contentCap : heroCap;
    for (const [w, h] of viewports) {
      const natural = w * arh;
      const box = Math.min(natural, px(cap, { w, h, floor, arh }));
      const crop = 1 - box / natural;
      assert.ok(crop <= maxCropFor(file) + 1e-9, `/${path.relative(distDir, file)} at ${w}x${h} crops ${(crop * 100).toFixed(1)}% of its scene`);
    }
    checked++;
  }
  // Pages that open on Ouro's contained Hero leave this full-bleed set, so it shrinks;
  // the guard only proves the pattern still finds heroes.
  assert.ok(checked > 0, `only ${checked} heroes checked`);
});

// Every hero ends on a hard edge at its picture's foot (Ari, 2026-11-08: no
// picture fades to nothing; his ruling on taste review r15: no hero box runs
// past its art). No mask on the box or the image, the gold trail closes the
// edge, and the drift zooms about the box's foot, so it never carries a foot
// out of the box.
test('every hero ends on a hard edge, closed by the trail, with no fade', () => {
  // Every rule for the selector, joined.
  const block = (selector) => {
    const bodies = [];
    for (let at = css.indexOf(`\n${selector} {`); at >= 0; at = css.indexOf(`\n${selector} {`, at + 1)) bodies.push(css.slice(at, css.indexOf('}', at)));
    assert.ok(bodies.length, `global.css has no "${selector}" rule`);
    return bodies.join('\n');
  };
  assert.doesNotMatch(css, /--hero-fade|--fade-at|--fade-run|--hero-apron|--paint-foot|data-hero-edge/);
  for (const selector of ['.story-hero', '.story-hero::after', '.story-meadow', '.story-meadow::before']) {
    assert.doesNotMatch(block(selector), /mask/, `${selector} carries a mask`);
  }
  assert.match(css, /\.story-hero\[data-trail-below\]::after \{ top: calc\(100% - 6px\); \}/);
  assert.match(block('.story-hero::after'), /top: calc\(100% - 18px\);[\s\S]*background: var\(--trail-path\)/);
  assert.match(block('.story-meadow::before'), /background: var\(--trail-path\)/);
  assert.match(css, /\.story-hero img \{ transform-origin: 58% 100%; animation: story-drift/);
  assert.match(css, /@keyframes story-drift \{ from \{[^}]*\} to \{ transform: scale\(1\.02\)/);
  // Words no longer rise into the picture.
  assert.doesNotMatch(css, /\.story-hero \+ [^{]*\{[^}]*margin-top: -/);
});

test('every scene names its cast\'s lowest point, inside the crop it keeps', () => {
  for (const [scene, [, bottom]] of Object.entries(heroFocus)) {
    assert.ok(castFoot[scene] > 0, `${scene} has no castFoot`);
    assert.ok(castFoot[scene] <= bottom, `${scene}: castFoot ${castFoot[scene]} sits below its heroFocus bottom ${bottom}`);
  }
});

test('every hero keeps its whole cast inside the box at 1024, 1280, 1440 and 1920', () => {
  let checked = 0;
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const hero = html.match(/<div class="story-scene story-hero([^"]*)"[^>]*data-brand-scene="([^"]+)"[^>]*style="([^"]*)"/);
    if (!hero) continue;
    const [, cls, scene, style] = hero;
    const num = (name) => Number(style.match(new RegExp(`--${name}:\\s*([\\d.]+)`))?.[1]);
    const floor = num('hero-floor');
    const arh = num('hero-arh');
    const y = num('hero-y') / 100;
    assert.doesNotMatch(style, /--hero-fade|--hero-origin|--hero-apron|--paint-foot/, `${file}: a hero carries fade machinery`);
    const frame = heroFrame(scene, { product: sceneFor(routeOfFile(file)).product });
    assert.equal(y, frame.y / 100, `${file}: --hero-y is not heroFrame()'s`);
    const below = new RegExp(`data-brand-scene="${scene}"(?: data-night-scene="[^"]+")? data-trail-below`).test(html);
    assert.equal(below, frame.trailBelow, `${file}: the trail ${frame.trailBelow ? 'must hang below' : 'sits on'} the edge`);
    if (below) assert.ok(1 - castFoot[scene] < FOOT_ROOM && y === 1, `${file}: only a cast on the art's own foot hangs the trail below`);
    const [top] = heroFocus[scene] ?? [0.2];
    const cap = /story-hero-content/.test(cls) ? contentCap : heroCap;
    for (const [w, h] of viewports) {
      const natural = w * arh;
      const share = Math.min(natural, px(cap, { w, h, floor, arh })) / natural;
      const where = `/${path.relative(distDir, file)} (${scene}) at ${w}x${h}`;
      // The foot sits FOOT_ROOM clear of the box's foot, unless the box shows the art's own foot.
      const foot = footInHero(scene, { share, y });
      assert.ok(y === 1 ? foot <= 1 : foot <= 1 - FOOT_ROOM + 1e-9, `${where}: the cast's foot sits at ${(foot * 100).toFixed(1)}% of the box`);
      // The head stays clear of the top, with the drift's 2% lift at its fullest.
      const head = (top - y * (1 - share)) / share;
      assert.ok(1 - (1 - head) * 1.02 >= 0, `${where}: a head leaves the top of the box`);
    }
    checked++;
  }
  // Pages that open on Ouro's contained Hero leave this full-bleed set, so it shrinks;
  // the guard only proves the pattern still finds heroes.
  assert.ok(checked > 0, `only ${checked} heroes checked`);
});

test('the cast\'s foot counts every character, not only Ouro', () => {
  // Taste review r11: round 10 had counted the picnic robots' seats on
  // /brief/ and /lab/why/, not their shoes. The shoes
  // reach 97% of the art, and so does the sneaker under the armchair.
  assert.ok(castFoot.friends >= 0.97, `friends castFoot ${castFoot.friends}`);
  assert.ok(castFoot['playwright-focus-proof'] >= 0.97);
  assert.ok(castFoot['ouroboros-skills'] >= 0.84, 'the reading robot\'s feet');
  assert.ok(castFoot.shepherd >= 0.935, 'the big sheep\'s hooves');
});

// No character stands within PHONE_EDGE px of either side of a phone hero
// (taste review r13, 2026-11-06: Ouro touched the right edge of the factory's
// phone hero on /lab/docs/architecture/, /lab/model-reviews/minimax/ and
// /lab/what-is-an-agent-harness/). The phone hero shows its crop at the full
// viewport width (scripts/hero-joins.mjs checks that in a real browser), so the
// cast's place across the crop (phoneCastX) is its place on the screen.
test('every scene keeps its cast at least 16px clear of both sides on a phone', async () => {
  const { phoneCastX, PHONE_EDGE, usedScenes, phoneArtEdge } = await import('../src/data/scenes.mjs');
  // The one named exemption: the art itself cuts the home scene's fence sheep.
  assert.deepEqual(Object.keys(phoneArtEdge), ['ourostack']);
  const close = [];
  for (const scene of usedScenes()) {
    const cast = phoneCastX[scene];
    assert.ok(cast, `${scene} has no phoneCastX`);
    for (const w of [320, 390, 430]) {
      const left = cast[0] * w;
      const right = (1 - cast[1]) * w;
      if (left < PHONE_EDGE - 0.01) close.push(`${scene} at ${w}: a character ${left.toFixed(1)}px from the left`);
      if (right < PHONE_EDGE - 0.01) close.push(`${scene} at ${w}: a character ${right.toFixed(1)}px from the right`);
    }
  }
  assert.deepEqual(close, []);
});
