// Shared by the round-18 checks (link-spaces, line-ends, label-swap,
// menu-swipe): serves dist/ on a local port, or reads the page list from a
// live site's sitemap when --base is given. The 404 page is served for any
// unknown path and checked under a made-up path.

import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml' };

export const args = process.argv.slice(2);
export const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
export const launchOptions = () => (process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

function distPages(missing, dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_astro' ? [] : distPages(missing, full);
    if (!entry.name.endsWith('.html') || /http-equiv="refresh"/.test(readFileSync(full, 'utf8'))) return [];
    const rel = '/' + relative(DIST, full).replace(/index\.html$/, '');
    return [rel === '/404.html' ? missing : rel];
  });
}

/** { base, pages, close } for dist/ on `port`, or for the live site in --base. */
export async function openSite({ port, missing }) {
  const live = opt('--base')?.replace(/\/$/, '');
  if (live) {
    const map = await (await fetch(`${live}/sitemap-0.xml`)).text();
    const pages = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
    pages.push(missing);
    return { base: live, pages, close() {} };
  }
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(DIST, path));
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(await readFile(join(DIST, '404.html')));
    }
  });
  await new Promise((resolve) => server.listen(port, resolve));
  return { base: `http://localhost:${port}`, pages: distPages(missing), close: () => server.close() };
}
