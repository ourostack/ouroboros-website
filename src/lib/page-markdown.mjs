// A page's Markdown twin: what an agent reads at /index.md instead of the HTML.
//
// Written from the page's own built HTML (astro:build:done, after code-wrap),
// so the twin can't say anything the page doesn't: one source, two readers.
// It keeps the page's <main> in order, turns each picture into its alt text,
// each clip into a link named by its label, and every link into an absolute
// URL. What a person sees but an agent can't use is left out: decorative
// pictures (alt=""), the night twin of a day picture, anything hidden or
// aria-hidden, buttons, scripts and styles.
//
// The home page's "Agent view" switch (src/components/AgentView.astro) shows
// this file, fetched from its real URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromHtml } from 'hast-util-from-html';
import { select } from 'hast-util-select';
import { toMdast } from 'hast-util-to-mdast';
import { toMarkdown } from 'mdast-util-to-markdown';

export const SITE = 'https://ouroboros.bot';

/** Route → its Markdown twin's path in dist/ (and on the site). */
export const MARKDOWN_PAGES = { '/': 'index.md' };

const DROP = new Set(['script', 'style', 'noscript', 'template', 'button', 'source', 'svg', 'wbr', 'link', 'meta']);

const classes = (node) => [node.properties?.className ?? []].flat().map(String);
const absolute = (url, route) => {
  try { return new URL(url, SITE + route).href; } catch { return url; }
};

function dropped(node) {
  if (node.type !== 'element') return false;
  const p = node.properties ?? {};
  if (DROP.has(node.tagName)) return true;
  if (p.hidden != null && p.hidden !== false) return true;
  if (String(p.ariaHidden) === 'true') return true;
  // A picture drawn in both themes says it once, by day.
  if (p.dataScheme === 'dark' || classes(node).includes('theme-dark-only')) return true;
  // A decorative picture has nothing to say.
  if (node.tagName === 'img' && !p.alt) return true;
  // The phone's copy of a line the wide layout also shows.
  if (p.dataNarrow != null) return true;
  return false;
}

const textOf = (node) => node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');
const ENDS = /[\p{L}\p{N}.?!:)\u201D]$/u;
const STARTS = /^[\p{L}\p{N}(\u201C]/u;

// Pieces that CSS sets on their own lines ("Act 1", then "Capability.") run
// together as text, so a space goes where two of them meet word to word.
function spaceBlocks(node) {
  const out = [];
  for (const child of node.children) {
    const prev = out[out.length - 1];
    if (prev && (prev.type === 'element' || child.type === 'element') && ENDS.test(textOf(prev)) && STARTS.test(textOf(child))) out.push({ type: 'text', value: ' ' });
    out.push(child);
  }
  node.children = out;
}

const HEADING = /^h[1-6]$/;
const firstElement = (node) => {
  for (const child of node.children ?? []) {
    if (child.type === 'text' && !child.value.trim()) continue;
    if (child.type !== 'element') return null;
    return HEADING.test(child.tagName) ? child : firstElement(child);
  }
  return null;
};

// A list whose items each open on a heading is a run of sections, not a list:
// its headings stand on their own lines ("#### Friends"), not as "- #### Friends".
function unwrapSectionLists(node) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'element' && /^[ou]l$/.test(child.tagName)) {
      const items = child.children.filter((c) => c.type === 'element');
      if (items.length && items.every((li) => li.tagName === 'li' && firstElement(li))) {
        return items.map((li) => ({ ...li, tagName: 'div' }));
      }
    }
    return [child];
  });
  node.children.forEach(unwrapSectionLists);
}

function prune(node, route, inPre = false) {
  if (!node.children) return;
  node.children = node.children.filter((child) => !dropped(child));
  if (inPre) {
    // A terminal's lines are spans set as blocks: each ends its line.
    for (const child of node.children) if (child.type === 'element' && classes(child).some((c) => /(^|-)line$/.test(c))) child.children.push({ type: 'text', value: '\n' });
  } else {
    spaceBlocks(node);
  }
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    const p = child.properties;
    if (child.tagName === 'a' && typeof p.href === 'string') p.href = absolute(p.href, route);
    if (child.tagName === 'img') {
      p.src = absolute(p.dataLightSrc ?? p.src ?? p.dataSrc ?? '', route);
      if (p.dataLightAlt) p.alt = p.dataLightAlt;
    }
    if (child.tagName === 'video') {
      // A clip an agent can't watch: a link to it, named by its label.
      const src = child.children.find((c) => c.tagName === 'source' && /mp4/.test(String(c.properties?.type)))?.properties?.src ?? p.src;
      const label = p.ariaLabel;
      Object.assign(child, label && src
        ? { tagName: 'a', properties: { href: absolute(src, route) }, children: [{ type: 'text', value: `Video: ${label}` }] }
        : { tagName: 'span', properties: {}, children: [] });
      continue;
    }
    prune(child, route, inPre || child.tagName === 'pre');
  }
}

const quote = (value) => JSON.stringify(value);

// A link's words start and end on the words: no "[ More about me ](...)".
function trimLinks(node) {
  if (node.type === 'link' && node.children.length) {
    const first = node.children[0], last = node.children[node.children.length - 1];
    if (first.type === 'text') first.value = first.value.trimStart();
    if (last.type === 'text') last.value = last.value.trimEnd();
  }
  node.children?.forEach(trimLinks);
}

/** The Markdown twin of one built page. */
export function pageMarkdown(html, route) {
  const tree = fromHtml(html);
  const main = select('main', tree);
  if (!main) throw new Error(`page-markdown: ${route} has no <main>`);
  prune(main, route);
  unwrapSectionLists(main);
  const title = select('title', tree)?.children?.[0]?.value ?? '';
  const description = select('meta[name="description"]', tree)?.properties?.content ?? '';
  const url = select('link[rel="canonical"]', tree)?.properties?.href ?? SITE + route;
  const mdast = toMdast(main);
  trimLinks(mdast);
  const body = toMarkdown(mdast, { bullet: '-', emphasis: '_', strong: '*', rule: '-', fences: true, listItemIndent: 'one' })
    .replace(/\u00A0/g, ' ')
    // A link's address is read and copied as it is: no Markdown escapes ("\&type=") in it.
    .replace(/\]\((https?:\/\/[^)\s]+)\)/g, (_, url) => `](${url.replace(/\\([!-/:-@[-`{-~])/g, '$1')})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `---\ntitle: ${quote(title)}\ndescription: ${quote(description)}\nurl: ${url}\n---\n\n${body}\n`;
}

/** Astro integration: writes each twin beside its page after the build. */
export default function pageMarkdownIntegration() {
  return {
    name: 'page-markdown',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const dist = fileURLToPath(dir);
        for (const [route, file] of Object.entries(MARKDOWN_PAGES)) {
          const html = fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
          fs.writeFileSync(path.join(dist, file), pageMarkdown(html, route));
        }
      },
    },
  };
}
