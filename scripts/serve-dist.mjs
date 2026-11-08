// Serves the built dist/ on 127.0.0.1 the way the production Worker does, so
// the page checks and the brand audit can read a PR's build instead of the
// live site (site-checks CI, round 21):
//  - the Worker's 301s (src/worker/redirects.mjs), query string kept;
//  - a directory path serves its index.html, a page path without its slash
//    gets a 307 to the slash, like Cloudflare's asset layer;
//  - any unknown path serves dist/404.html with status 404
//    ("not_found_handling": "404-page" in wrangler-worker.jsonc).
//
//   npm run build && node scripts/serve-dist.mjs [--port 4321]
//
// Exported as serveDist() for scripts/check-all.mjs.

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { redirectFor } from '../src/worker/redirects.mjs';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.sh': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

/** Starts the server; resolves to { base, close }. */
export async function serveDist({ port = 4321, host = '127.0.0.1' } = {}) {
  const server = createServer((req, res) => {
    respond(req, res).catch((error) => {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(error));
    });
  });
  async function respond(req, res) {
    const url = new URL(req.url, `http://${host}:${port}`);
    const moved = redirectFor(url.pathname);
    if (moved) {
      res.writeHead(301, { location: moved + url.search });
      return res.end();
    }
    let path = normalize(decodeURIComponent(url.pathname));
    if (path.includes('..')) path = '/';
    let file = join(DIST, path.endsWith('/') ? path + 'index.html' : path);
    if (!path.endsWith('/') && !(await isFile(file)) && (await isFile(join(DIST, path, 'index.html')))) {
      res.writeHead(307, { location: path + '/' + url.search });
      return res.end();
    }
    let status = 200;
    if (!(await isFile(file))) {
      status = 404;
      file = join(DIST, '404.html');
    }
    const body = await readFile(file);
    res.writeHead(status, { 'content-type': types[extname(file)] || 'application/octet-stream', 'content-length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  }
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return { base: `http://${host}:${port}`, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : process.env.PORT || 4321);
  const { base } = await serveDist({ port });
  console.log(`serving dist/ at ${base}`);
}
