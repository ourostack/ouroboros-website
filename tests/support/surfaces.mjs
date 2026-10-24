// The published surfaces the sentence retention check guards, beyond a page's
// visible text: its attribute text (title, meta and share descriptions, alt and
// aria-label), each page's share card (src/data/og.ts), and brief.md.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from './dist.mjs';

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : null;
};

// Attribute text of an HTML document, one string per value, in document order.
export function attributeTextsOf(html) {
  const out = [];
  const title = html.match(/<title>([\s\S]*?)<\/title>/);
  if (title) out.push(decode(title[1]).replace(/\s+/g, ' ').trim());
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/g)) {
    const key = attr(tag, 'name') ?? attr(tag, 'property');
    if (key && /^(description|og:title|og:description|twitter:title|twitter:description)$/.test(key)) {
      const content = attr(tag, 'content');
      if (content) out.push(content);
    }
  }
  for (const [tag] of html.replace(/<script\b[\s\S]*?<\/script>/gi, '').matchAll(/<[a-z][^>]*>/gi)) {
    for (const name of ['alt', 'aria-label']) {
      const value = attr(tag, name);
      if (value) out.push(value);
    }
  }
  return out;
}

// Each share card's words: its tag, title and subtitle.
export function shareCardTextsOf(pageOg) {
  const out = {};
  for (const [route, entry] of Object.entries(pageOg)) out[route] = [entry.tag, entry.title, entry.subtitle].filter(Boolean);
  return out;
}

// brief.md, whitespace collapsed and split into sentences.
export function sentencesOf(text) {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function readBrief(dir) {
  return fs.readFileSync(path.join(dir, 'brief.md'), 'utf8');
}
