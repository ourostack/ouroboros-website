import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { distDir, listHtmlFiles } from './support/dist.mjs';

// No desktop hero crops more than about a fifth of its scene away (taste
// review r8, 2026-11-06: the legal pages' short band and ouro.bot's capped
// Ouro MD hero cut Ouro's body off at 1024, 1440 and 1920). The box is
// object-fit: cover at the full width, so the share of the art it shows is its
// height over the art's own height at that width. This reads the shipped
// max-height rules from global.css and each page's own --hero-floor and
// --hero-arh, and evaluates them at each laptop and desktop viewport.
// scripts/hero-crop.mjs measures the same thing in a real browser.

const MAX_CROP = 0.2;
const viewports = [[1024, 768], [1440, 900], [1920, 1080]];
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
