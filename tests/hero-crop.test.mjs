import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, listHtmlFiles } from './support/dist.mjs';
import { castFoot, heroFocus, FOOT_ALPHA, fadeAlpha, footInHero } from '../src/data/scenes.mjs';

// No desktop hero crops more than about a fifth of its scene away (taste
// review r8, 2026-11-06: the legal pages' short band and ouro.bot's capped
// Ouro MD hero cut Ouro's body off at 1024, 1440 and 1920). The box is
// object-fit: cover at the full width, so the share of the art it shows is its
// height over the art's own height at that width. This reads the shipped
// max-height rules from global.css and each page's own --hero-floor and
// --hero-arh, and evaluates them at each laptop and desktop viewport.
// scripts/hero-crop.mjs measures the same thing in a real browser.

const MAX_CROP = 0.2;
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
      assert.ok(crop <= MAX_CROP, `/${path.relative(distDir, file)} at ${w}x${h} crops ${(crop * 100).toFixed(1)}% of its scene`);
    }
    checked++;
  }
  assert.ok(checked > 20, `only ${checked} heroes checked`);
});

// No character dissolves into the hero's bottom fade (taste review r10,
// 2026-11-06: Ouro's lower coil faded into the page on /ouro-hx/ at 1024, 1440
// and 1920, and the picnic robots' legs on /brief/). The mask runs from opaque
// at the page's --hero-fade to clear at the box's foot; the lowest point of
// every character (castFoot, read off the art: Ouro, robots, people, sheep;
// taste review r11 added the picnic robots' shoes) must keep FOOT_ALPHA of
// itself at every laptop and desktop viewport, with the slow drift at its
// fullest. Where the cast stands on the art's very foot, the box runs on past
// the art by --hero-apron, and the fade runs over that.
test('global.css starts each hero\'s fade, and its drift, at the page\'s own --hero-fade', () => {
  const at = css.indexOf('.story-hero {\n  --fade-at: var(--hero-fade');
  assert.ok(at >= 0, 'global.css has no .story-hero mask rule');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.match(rule, /--fade-at: var\(--hero-fade, [\d.]+%\);\s+--fade-run: calc\(100% - var\(--hero-fade, [\d.]+%\)\);/);
  // The fade eases (taste review r14), and over its first half, where a
  // foot may sit, it never keeps less than the straight ramp heroFrame()
  // and fadeAlpha() assume.
  for (const prop of ['-webkit-mask-image', 'mask-image']) {
    const value = rule.match(new RegExp(`(?:^|\\s)${prop}: ([^;]+);`))?.[1] ?? '';
    assert.match(value, /^linear-gradient\(to bottom, #000 0%, #000 var\(--fade-at\), /, prop);
    assert.match(value, /, transparent 100%\)$/, prop);
    const stops = [...value.matchAll(/rgb\(0 0 0 \/ ([\d.]+)\) calc\(var\(--fade-at\) \+ var\(--fade-run\) \* ([\d.]+)\)/g)].map(([, a, t]) => [+t, +a]);
    assert.ok(stops.length >= 5, `${prop}: an eased fade has its stops`);
    for (const [t, a] of stops) if (t <= 0.5) assert.ok(a >= 1 - t, `${prop}: at ${t} of the fade it keeps ${a}, under the straight ramp's ${1 - t}`);
  }
  assert.match(css, /\.story-hero img \{ transform-origin: 58% var\(--hero-origin, [\d.]+%\); animation: story-drift/);
  assert.match(css, /\.story-hero \{ padding-bottom: calc\(var\(--hero-apron, 0\) \* var\(--hero-arh, [\d.]+\) \* 100vw\); \}/);
  assert.match(css, /@keyframes story-drift \{ from \{[^}]*\} to \{ transform: scale\(1\.02\)/);
});

test('every scene names its cast\'s lowest point, inside the crop it keeps', () => {
  for (const [scene, [, bottom]] of Object.entries(heroFocus)) {
    assert.ok(castFoot[scene] > 0, `${scene} has no castFoot`);
    assert.ok(castFoot[scene] <= bottom, `${scene}: castFoot ${castFoot[scene]} sits below its heroFocus bottom ${bottom}`);
  }
});

test('no character dissolves into the bottom fade at 1024, 1280, 1440 or 1920', () => {
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
    const fade = num('hero-fade') / 100;
    const origin = num('hero-origin') / 100;
    const apron = style.includes('--hero-apron') ? num('hero-apron') : 0;
    assert.ok(fade >= 0.72 && fade <= 0.94, `${file}: --hero-fade ${fade} is missing or outside 72-94%`);
    assert.ok(origin >= fade && origin <= 1, `${file}: --hero-origin ${origin} must sit at or below the fade line`);
    if (apron) assert.match(style, /--paint-foot: url\(data:image\/webp;base64,/, `${file}: an apron needs its foot paint`);
    const cap = /story-hero-content/.test(cls) ? contentCap : heroCap;
    for (const [w, h] of viewports) {
      const natural = w * arh;
      const share = Math.min(natural, px(cap, { w, h, floor, arh })) / natural;
      const alpha = fadeAlpha(footInHero(scene, { share, y, apron, origin }), fade);
      assert.ok(alpha >= FOOT_ALPHA - 0.005, `/${path.relative(distDir, file)} (${scene}) at ${w}x${h}: the cast's foot keeps only ${(alpha * 100).toFixed(0)}% of itself in the fade`);
    }
    checked++;
  }
  assert.ok(checked > 20, `only ${checked} heroes checked`);
});

test('the cast\'s foot counts every character, not only Ouro', () => {
  // Taste review r11: the picnic robots' shoes on /brief/ and /lab/why/
  // softened into the fade; round 10 had counted their seats. The shoes
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
