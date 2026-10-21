import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Ari, 2026-10-20: text flows to the full width of its column. Nothing caps a line length.
// The only width limits are the page container (max-w-6xl) and the nav (max-w-7xl).
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(astro|css)$/.test(entry.name)) files.push(full);
  }
};
walk(new URL('../src', import.meta.url).pathname);

test('no text has its own max-width: it flows to the width of its column', () => {
  const offenders = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(process.cwd(), file);
    for (const [cls] of source.matchAll(/\b(?:(?:sm|md|lg|xl|2xl):)?max-w-(?:\[[\d.]+(?:ch|rem|em)\]|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|prose)\b/g)) {
      if (/SerpentGuidePreview/.test(rel) && cls === 'max-w-2xl') continue; // a terminal mock, not flowing text
      offenders.push(`${rel}: ${cls}`);
    }
    for (const [rule] of source.matchAll(/max-width:\s*[\d.]+(?:ch|rem|em)\b/g)) offenders.push(`${rel}: ${rule}`);
  }
  assert.deepEqual(offenders, []);
});
