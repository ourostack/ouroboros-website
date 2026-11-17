// /llms.txt, the site's map for agents (llmstxt.org v2, August 2026), and the
// Markdown twins it links to. Ari, 2026-11-16: "do make sure ... that llms.txt
// is optimal". Every title and note comes from the page it names, so these tests
// read the build, not a copy of the words.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fromHtml } from 'hast-util-from-html';
import { select } from 'hast-util-select';
import { distDir, readDist } from './support/dist.mjs';
import { labelFor } from '../src/data/readiness.mjs';
import { tools } from '../src/data/agent-map.mjs';

const SITE = 'https://ouroboros.bot';
const llms = () => readDist('llms.txt');
const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));
const page = (route) => fromHtml(readDist(`${route.slice(1)}index.html`));
const pageTitle = (route) => textOf(select('title', page(route))).replace(/ \| Ouro( docs| blog)?$/, '');
const pageDescription = (route) => select('meta[name="description"]', page(route)).properties.content;
const twinOf = (route) => `${route}index.md`;

// Every page under src/pages/blog and src/pages/lab, as its route. A page made
// per item from data ([provider].astro) is reached from the page that lists it.
function routesUnder(dir) {
  const root = path.join(process.cwd(), 'src/pages');
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith('.astro') && !e.name.includes('[')) {
        const rel = path.relative(root, f).replace(/\.astro$/, '').replace(/(^|\/)index$/, '');
        out.push(`/${rel}/`.replace(/\/+/g, '/'));
      }
    }
  };
  walk(path.join(root, dir));
  return out.sort();
}
const listedPages = [...routesUnder('blog'), ...routesUnder('lab')];

const links = (text) => [...text.matchAll(/^- \[([^\]]+)\]\(([^)\s]+)\)(?:: (.*))?$/gm)].map(([, name, url, notes]) => ({ name, url, notes }));

test('llms.txt has the llmstxt.org v2 shape: one H1, a summary, prose, then H2 lists of links', () => {
  const text = llms();
  const lines = text.split('\n');
  assert.equal(lines[0], '# ouroboros.bot');
  assert.match(lines[2], /^> \S/, 'a blockquote summary follows the H1');
  assert.equal(lines.filter((l) => /^#(?!#)/.test(l)).length, 1, 'only one H1, and no "#" comment lines');
  const firstH2 = lines.findIndex((l) => l.startsWith('## '));
  assert.ok(firstH2 > 3);
  for (const line of lines.slice(firstH2).filter((l) => l.trim())) {
    assert.match(line, /^(## \S.*|- \[[^\]]+\]\([^)\s]+\)(: .+)?)$/, `not a heading or a list link: ${line}`);
  }
  assert.doesNotMatch(text, /^(User-Agent|Purpose|Read|Docs|Sitemap|Skills-Manifest):/m, 'no non-spec directive lines');
  assert.doesNotMatch(text, /<[a-z][^>]*>/i);
  assert.doesNotMatch(text, /\{\{/);
});

test('every blog and Lab page is listed by its own title and description, linked to its Markdown twin', () => {
  assert.ok(listedPages.length >= 20, `found only ${listedPages.length} pages`);
  const lines = llms().split('\n');
  for (const route of listedPages) {
    const line = `- [${pageTitle(route)}](${SITE}${twinOf(route)}): ${pageDescription(route)}`;
    assert.ok(lines.includes(line), `llms.txt is missing or misnames ${route}; expected:\n${line}`);
  }
});

test('the blog index lists every post under the title the post itself carries', () => {
  const index = page('/blog/');
  for (const route of routesUnder('blog').filter((r) => r !== '/blog/')) {
    const link = select(`.post-title a[href="${route}"]`, index);
    assert.ok(link, `the blog index does not link ${route}`);
    assert.equal(textOf(link).replace(/\s+/g, ' ').trim(), pageTitle(route), `the blog index names ${route} differently from the post`);
  }
});

test('titles are quoted as written, starting with Trust the Fucking Agent', () => {
  const text = llms();
  const prose = text.slice(0, text.indexOf('\n## '));
  assert.match(prose, /Quote every title exactly as written/);
  assert.ok(prose.includes('Trust the Fucking Agent'));
  assert.ok(text.includes(`- [Trust the Fucking Agent](${SITE}/blog/trust-the-agent/index.md): `));
  assert.doesNotMatch(text, /Trust the (F\*+|F\.|Freaking|Effing) Agent|\[Trust the agent\]/i);
});

// The family lists each site's front door, by the family bar's names (tests/agent-surfaces.test.mjs).
const sectionOf = (heading) => { const text = llms(); const at = text.indexOf(`## ${heading}\n`); const end = text.indexOf('\n## ', at + 1); return text.slice(at, end < 0 ? undefined : end); };

test('every page link to this site in llms.txt is Markdown that the build holds', () => {
  for (const { url } of links(llms().replace(sectionOf('The Ouro family'), '')).filter(({ url }) => url.startsWith(SITE))) {
    const file = new URL(url).pathname.slice(1);
    assert.ok(fs.existsSync(path.join(distDir, file)), `${url} is not in dist/`);
    if (!/\.(json|xml|txt)$/.test(file)) assert.match(file, /\.md$/, `${url} should be the page's Markdown twin`);
  }
});

test('each twin names its page, and each page names its twin in its head', () => {
  for (const { url } of links(llms()).filter(({ url }) => url.startsWith(SITE) && url.endsWith('/index.md'))) {
    const twin = new URL(url).pathname;
    const route = twin.slice(0, -'index.md'.length);
    assert.match(readDist(twin.slice(1)), new RegExp(`^---\\ntitle: .*\\ndescription: .*\\nurl: ${SITE}${route}\\n---\\n`), `${twin} front matter`);
    assert.doesNotMatch(readDist(twin.slice(1)), /<!--/, `${twin} carries an HTML comment`);
    const head = select('head', page(route));
    assert.ok(select(`link[rel="alternate"][type="text/markdown"][href="${twin}"]`, head), `${route} does not link ${twin}`);
    assert.ok(select('link[rel="describedby"][href="/llms.txt"]', head), `${route} does not link /llms.txt`);
  }
});

const headerRules = () => readDist('_headers').split(/\n(?=\S)/).filter((b) => !b.startsWith('#') && b.trim()).map((block) => {
  const [url, ...headers] = block.trim().split('\n');
  return { url, headers: headers.map((h) => h.trim()) };
});

test('_headers names each twin for its page, types only real Markdown files, and stays inside Cloudflare\'s limits', () => {
  const rules = headerRules();
  assert.ok(rules.length <= 100, `${rules.length} rules; Cloudflare reads at most 100`);
  for (const line of readDist('_headers').split('\n')) assert.ok(line.length < 2000);
  assert.ok(!rules.some((r) => r.url === '/*.md'), 'a /*.md rule also types the 404 page as Markdown');
  const rule = (url) => rules.find((r) => r.url === url)?.headers ?? [];
  for (const { url } of links(llms()).filter(({ url }) => url.startsWith(SITE) && url.endsWith('/index.md'))) {
    const twin = new URL(url).pathname;
    const route = twin.slice(0, -'index.md'.length);
    assert.ok(rule(route).includes(`Link: <${twin}>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`), `${route} header`);
    assert.ok(rule(twin).includes('Content-Type: text/markdown; charset=utf-8'), `${twin} type`);
    assert.ok(rule(twin).includes(`Link: <${SITE}${route}>; rel="canonical", </llms.txt>; rel="describedby"`), `${twin} links`);
  }
  assert.ok(rule('/brief.md').includes('Content-Type: text/markdown; charset=utf-8'));
  assert.ok(rule('/llms.txt').includes('Content-Type: text/plain; charset=utf-8'));
});

test('llms-full.txt holds every twin llms.txt links, in its order', () => {
  const full = readDist('llms-full.txt');
  let at = -1;
  for (const { url } of links(llms()).filter(({ url }) => url.startsWith(SITE) && url.endsWith('.md'))) {
    const body = readDist(new URL(url).pathname.slice(1)).trim();
    const found = full.indexOf(body);
    assert.ok(found > at, `${url} is missing from llms-full.txt or out of order`);
    at = found;
  }
  assert.ok(llms().includes(`(${SITE}/llms-full.txt): `));
});

test('each tool is one line: its page\'s own description, then its readiness label as its status', () => {
  const byName = new Map(links(sectionOf('Tools')).map((l) => [l.name, l]));
  for (const tool of tools) {
    const line = byName.get(tool.name);
    assert.ok(line, `Tools is missing ${tool.name}`);
    if (tool.route) {
      assert.equal(line.url, `${SITE}${twinOf(tool.route)}`);
      assert.ok(line.notes.startsWith(pageDescription(tool.route)), `${tool.name} restates its page instead of quoting its description`);
    } else {
      assert.equal(line.url, tool.href);
    }
    // The label once: a description that already says it doesn't repeat it.
    if (tool.readiness) assert.ok(line.notes.endsWith(` Status: ${labelFor(tool.readiness).label}.`) || (tool.route && pageDescription(tool.route).includes(labelFor(tool.readiness).label)), `${tool.name} status`);
  }
});

test('Support is a link to ourostack on GitHub', () => {
  const support = llms().slice(llms().indexOf('## Support'));
  assert.match(support, /^- \[ourostack on GitHub\]\(https:\/\/github\.com\/ourostack\): /m);
  assert.doesNotMatch(llms(), /https:\/\/github\.com\/ourostack\.(\s|$)/, 'a bare URL with a trailing period');
});

test('twins keep addresses, emails and paths copyable: no Markdown escapes in plain text', () => {
  for (const { url } of links(llms()).filter(({ url }) => url.startsWith(SITE) && url.endsWith('/index.md'))) {
    const prose = readDist(new URL(url).pathname.slice(1)).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    assert.doesNotMatch(prose, /\\[:@~]|www\\\./, `${url} escapes a character an agent would copy`);
  }
});
