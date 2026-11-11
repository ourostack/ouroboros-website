import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { listHtmlFiles, distDir } from './support/dist.mjs';

// Every heading is set in the display serif (AGENTS.md rule 3; taste review r6
// found the per-model headings on /lab/model-reviews/ in the sans, and a sweep
// found mono labels marked up as headings on the docs pages and /ouro-md/).
// A heading that carries classes must name the serif: font-display, a
// .heading-* utility, or a class whose own rule sets font-family to it.
// Mono or sans label styles belong on a <p>, not a heading.
const cssFiles = [];
const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.css')) cssFiles.push(f); } };
walk(distDir);
const htmlFiles = listHtmlFiles();
const css = [...cssFiles.map((f) => fs.readFileSync(f, 'utf8')), ...htmlFiles.flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]))].join('\n');
const serifClasses = new Set(['font-display']);
for (const [, selectors] of css.matchAll(/([^{}]+)\{[^}]*font-family:\s*var\(--font-display\)/g)) {
  for (const [, cls] of selectors.matchAll(/\.([\w-]+)/g)) serifClasses.add(cls);
}
// Ouro HX headings (CardTitle and friends) take var(--font-heading), which the
// site's theme maps to the display serif.
const headingIsSerif = /--font-heading:\s*var\(--font-display\)/.test(css);
const namesSerif = (c) => serifClasses.has(c) || /^heading-/.test(c) || (headingIsSerif && /^font-\[family-name:var\(--font-heading[,)]/.test(c));

test('every classed heading on every page names the display serif', () => {
  const misses = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, tag, cls] of html.matchAll(/<(h[1-6])\b[^>]*\bclass="([^"]*)"/g)) {
      if (!cls.split(/\s+/).some(namesSerif)) misses.push(`${path.relative(distDir, file)}: <${tag} class="${cls}">`);
    }
  }
  assert.deepEqual(misses, []);
});
