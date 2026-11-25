// /llms.txt, /llms-full.txt and the headers that point agents at them, written
// after the build from the built pages (llmstxt.org v2, August 2026).
//
// src/data/llms.txt holds the only hand-written words: the summary and the
// guidance above the lists. Every list line is generated: a page's line is its
// own title and meta description (src/data/agent-map.mjs says which pages, in
// what order), a tool's line adds its readiness label, and the family comes from
// src/data/family.json. So llms.txt can't drift from the site it describes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromHtml } from 'hast-util-from-html';
import { select } from 'hast-util-select';
import { SITE, pageSections, tools, twinFor, twinRoutes } from '../data/agent-map.mjs';
import { labelFor } from '../data/readiness.mjs';

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

/** A built page's own title (without the site's " | Ouro" suffix) and description. */
export function pageMeta(dist, route) {
  const tree = fromHtml(fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8'));
  const title = textOf(select('title', tree) ?? { type: 'text', value: '' }).replace(/ \| Ouro( docs| blog)?$/, '').trim();
  const description = select('meta[name="description"]', tree)?.properties?.content;
  if (!title || !description) throw new Error(`llms: ${route} has no title or description`);
  return { title, description };
}

const line = (name, url, notes) => `- [${name}](${url})${notes ? `: ${notes}` : ''}`;
const section = (heading, lines) => [`## ${heading}`, '', ...lines].join('\n');

export function llmsText(dist) {
  const family = JSON.parse(fs.readFileSync(path.join(dataDir, 'family.json'), 'utf8')).links;
  const sections = [
    ...pageSections.map(({ heading, routes }) => section(heading, routes.map((route) => {
      const { title, description } = pageMeta(dist, route);
      return line(title, SITE + twinFor(route), description);
    }))),
    section('Tools', tools.map((tool) => {
      const notes = tool.route ? pageMeta(dist, tool.route).description : tool.note;
      const label = tool.readiness && labelFor(tool.readiness).label;
      const status = label && !notes.includes(label) ? ` Status: ${label}.` : '';
      return line(tool.name, tool.route ? SITE + twinFor(tool.route) : tool.href, notes + status);
    })),
    section('The Ouro family', family.map((link) => line(link.label, link.href))),
    section('Support', [
      line('ourostack on GitHub', 'https://github.com/ourostack', 'Each project takes issues in its own repository. Ask the human before filing, then file what happened and how to repeat it.'),
    ]),
    section('Optional', [
      line('Every page on this site listed above, in one file', `${SITE}/llms-full.txt`, 'Each Markdown twin linked here, in this order, for an agent that wants them all at once.'),
      line('Harness skills manifest', `${SITE}/skills/manifest.json`, 'Skills for agents working with an Ouroboros harness install.'),
      line('Sitemap', `${SITE}/sitemap-index.xml`, 'Every page, for crawlers.'),
    ]),
  ];
  const template = fs.readFileSync(path.join(dataDir, 'llms.txt'), 'utf8');
  return template.replace('{{sections}}', sections.join('\n\n'));
}

/** Every Markdown file llms.txt links on this site, in its order. */
const linkedTwins = (llms) => [...llms.matchAll(/^- \[[^\]]+\]\((https:\/\/ouroboros\.bot\/[^)\s]+\.md)\)/gm)].map((m) => new URL(m[1]).pathname);

export function llmsFullText(dist, llms) {
  const parts = linkedTwins(llms).map((twin) => fs.readFileSync(path.join(dist, twin), 'utf8').trim());
  return `# ouroboros.bot, in full\n\n> Every page on this site that /llms.txt lists, as its Markdown twin, in the same order.\n\n${parts.join('\n\n')}\n`;
}

/**
 * _headers rules: each page names its twin and llms.txt, and each twin names
 * its page. Rules name exact files, so a 404 is never typed as Markdown.
 */
export function headerRules(dist) {
  const rules = [];
  const twins = new Set(twinRoutes.map(twinFor));
  for (const route of twinRoutes) {
    const twin = twinFor(route);
    rules.push(`${route}\n  Link: <${twin}>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`);
    rules.push(`${twin}\n  Content-Type: text/markdown; charset=utf-8\n  Link: <${SITE}${route}>; rel="canonical", </llms.txt>; rel="describedby"`);
  }
  // The other Markdown files, such as the harness skills, say they are UTF-8 too.
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(dist).filter((f) => f.endsWith('.md')).map((f) => `/${path.relative(dist, f).split(path.sep).join('/')}`).sort()) {
    if (!twins.has(file)) rules.push(`${file}\n  Content-Type: text/markdown; charset=utf-8`);
  }
  for (const file of ['/llms.txt', '/llms-full.txt']) rules.push(`${file}\n  Content-Type: text/plain; charset=utf-8`);
  return `\n# Written by src/lib/llms.mjs after the build: each page names its Markdown twin and /llms.txt, and each twin names its page.\n${rules.join('\n\n')}\n`;
}

export function writeAgentFiles(dist) {
  const llms = llmsText(dist);
  fs.writeFileSync(path.join(dist, 'llms.txt'), llms);
  fs.writeFileSync(path.join(dist, 'llms-full.txt'), llmsFullText(dist, llms));
  fs.appendFileSync(path.join(dist, '_headers'), headerRules(dist));
  const count = fs.readFileSync(path.join(dist, '_headers'), 'utf8').split('\n').filter((l) => /^\S/.test(l) && !l.startsWith('#')).length;
  if (count > 100) throw new Error(`llms: _headers has ${count} rules; Cloudflare reads only the first 100`);
}
