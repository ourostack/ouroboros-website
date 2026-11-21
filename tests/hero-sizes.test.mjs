import assert from 'node:assert/strict';
import test from 'node:test';
import { WIDE_HERO_SIZES } from '../src/data/page-hero.mjs';

// A browser reads the rem in an img's sizes at its initial 16px, but the page
// draws rem at the root's size, which ouro-base raises on big screens: 112.5%
// from 150rem (2400px) and 125% from 200rem (3200px). A sizes written in rem
// then asks for a smaller file than the art is drawn at, and the art blurs
// (ourostack/ouroboros-website#469: drawn 2520px wide from the 2304 file at 3840).
const root = (vw) => (vw >= 3200 ? 20 : vw >= 2400 ? 18 : 16);

// The width the browser picks a file for, from a sizes attribute at a viewport width.
function sizesAt(sizes, vw) {
  for (const arm of sizes.split(/,\s*(?![^()]*\))/)) {
    const m = /^\((min|max)-width:\s*(\d+)px\)\s+(.+)$/.exec(arm.trim());
    if (m && (m[1] === 'min' ? vw < Number(m[2]) : vw > Number(m[2]))) continue;
    const expr = (m ? m[3] : arm.trim())
      .replace(/calc\(/g, '(')
      .replace(/min\(/g, 'Math.min(')
      .replace(/(\d+(?:\.\d+)?)vw/g, (_, n) => String((n / 100) * vw))
      .replace(/(\d+(?:\.\d+)?)rem/g, (_, n) => String(n * 16))
      .replace(/(\d+(?:\.\d+)?)px/g, '$1');
    return Function(`return ${expr}`)();
  }
  throw new Error(`no arm of ${sizes} applies at ${vw}px`);
}

// The width global.css (.page-hero--wide) draws the art at from 1600px:
// min(100vw - 9rem, 1.5 x --container-6xl), where the container is 72rem, and 84rem from 2000px.
const drawn = (vw) => Math.min(vw - 9 * root(vw), 1.5 * (vw >= 2000 ? 84 : 72) * root(vw));

test('the wide hero asks for the width it is drawn at, at every root size ouro-base sets', () => {
  for (const vw of [1600, 1920, 1999, 2000, 2399, 2400, 2560, 3199, 3200, 3840, 5120, 7680]) {
    assert.equal(sizesAt(WIDE_HERO_SIZES, vw), drawn(vw), `at ${vw}px`);
  }
});
