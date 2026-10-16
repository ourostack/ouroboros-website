// Shared helpers for tests that read the built site in dist/.
// Run `npm run build` first; `npm test` does both.
import fs from 'node:fs';
import path from 'node:path';

export const distDir = path.join(process.cwd(), 'dist');

export function distPath(relativePath) {
  return path.join(distDir, relativePath);
}

export function readDist(relativePath) {
  return fs.readFileSync(distPath(relativePath), 'utf8');
}

export function distExists(relativePath) {
  return fs.existsSync(distPath(relativePath));
}

const entities = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&larr;': '←',
  '&middot;': '·', '&hellip;': '…', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
};

export function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (entity) => entities[entity] ?? entity);
}

// Visible text of an HTML document: scripts, styles and comments removed,
// tags stripped, entities decoded and whitespace collapsed.
export function textOf(html) {
  return decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

export function hrefsOf(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map(([, href]) => decode(href));
}

export function listHtmlFiles(dir = distDir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Optional deny-list of strings that must never appear on the built site.
// It lives outside this public repository: set SITE_DENYLIST (one entry per
// line or comma separated) or SITE_DENYLIST_FILE (a path, one entry per line).
// Returns null when neither is set, so the check is skipped.
export function loadDenyList() {
  let raw = process.env.SITE_DENYLIST ?? null;
  if (raw == null && process.env.SITE_DENYLIST_FILE) {
    raw = fs.readFileSync(process.env.SITE_DENYLIST_FILE, 'utf8');
  }
  if (raw == null) return null;
  const entries = raw.split(/[\n,]/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  return entries.length ? entries : null;
}
