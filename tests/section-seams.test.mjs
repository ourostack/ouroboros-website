// scripts/section-seams.mjs reads the page's ground only once every picture on it has
// arrived and decoded: a slow picture that covers a section change must not leave the
// check reading the bare change behind it (#442: a one-off 47.2 step at /approach/'s
// footer hairline, 1440 dark, on #441's run).
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/section-seams.mjs', import.meta.url));
// The ground steps from rgb(16,16,16) to rgb(56,56,56) where section a meets section b
// (y=1200): a seam, unless a picture covers it.
const gradient = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="200" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(16,16,16)"/><stop offset="1" stop-color="rgb(56,56,56)"/></linearGradient></defs><rect width="1440" height="200" fill="url(#g)"/></svg>';
const style = 'html,body{margin:0;background:rgb(16,16,16)} main{position:relative} main>section{height:1200px} .a{background:rgb(16,16,16)} .b{background:rgb(56,56,56)} footer{height:300px;background:rgb(56,56,56)}';
const page = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${style}${extra}</style></head><body><main><section class="a"></section><section class="b"></section>${body}</main><footer></footer></body></html>`;
const pages = {
  // A real seam, with nothing over it: the check must still fail it.
  '/bare/': page(''),
  // A real seam beside a scene picture that has arrived: the log names the picture it skipped.
  '/scene/': page('<div class="story-scene" style="position:absolute;left:0;top:1000px;width:100%"><img alt="" src="/gradient.svg" style="display:block;width:100%;height:150px"></div>'),
  // A picture over the change, whose src is set on load (as Layout.astro defers the meadow) and arrives late.
  '/img/': page(
    '<img class="cover" alt="" data-src="/slow-gradient.svg">',
    '.cover{position:absolute;left:0;top:1100px;width:100%;height:200px;display:block}',
  ).replace('</body>', '<script>addEventListener("load",()=>{for(const i of document.querySelectorAll("img[data-src]"))i.src=i.dataset.src})</script></body>'),
  // The same picture as a CSS background, whose class is set on load and whose image arrives late.
  '/background/': page(
    '<div class="cover"></div>',
    '.cover{position:absolute;left:0;top:1100px;width:100%;height:200px} .lit .cover{background:url(/slow-gradient.svg) 0 0/100% 100% no-repeat}',
  ).replace('</body>', '<script>addEventListener("load",()=>document.body.classList.add("lit"))</script></body>'),
};

async function serve() {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/gradient.svg') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); res.end(gradient); return; }
    if (path === '/slow-gradient.svg') {
      setTimeout(() => { res.writeHead(200, { 'content-type': 'image/svg+xml' }); res.end(gradient); }, 2500);
      return;
    }
    res.writeHead(pages[path] ? 200 : 404, { 'content-type': 'text/html' });
    res.end(pages[path] ?? '');
  });
  await new Promise((resolve) => server.listen(0, resolve));
  return server;
}

function check(base, path) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, '--base', base, '--pages', path], { env: process.env, timeout: 120_000 }, (error, stdout, stderr) => resolve({ code: error ? error.code ?? 1 : 0, out: stdout + stderr }));
  });
}

test('section seams: a real seam with nothing over it still fails, and says no picture was skipped there', async () => {
  const server = await serve();
  try {
    const { code, out } = await check(`http://localhost:${server.address().port}`, '/bare/');
    assert.equal(code, 1, out);
    assert.match(out, /\/bare\/ y=\d+: 120\.0 \(a seam: the ground steps 120\.0 in one row; no picture skipped near it\)/);
  } finally { server.close(); }
});

test('section seams: a seam beside a scene says which pictures it skipped there', async () => {
  const server = await serve();
  try {
    const { code, out } = await check(`http://localhost:${server.address().port}`, '/scene/');
    assert.equal(code, 1, out);
    assert.match(out, /pictures skipped near it: y=1000-1150 story-scene; y=1000-1150 \/gradient\.svg\)/);
  } finally { server.close(); }
});

test('section seams: a slow <img> over a section change is waited for, loaded and decoded, before the rows are read', async () => {
  const server = await serve();
  try {
    const { code, out } = await check(`http://localhost:${server.address().port}`, '/img/');
    assert.equal(code, 0, out);
    assert.match(out, /0 seams over 6/);
  } finally { server.close(); }
});

test('section seams: a slow CSS background over a section change is loaded before the rows are read', async () => {
  const server = await serve();
  try {
    const { code, out } = await check(`http://localhost:${server.address().port}`, '/background/');
    assert.equal(code, 0, out);
    assert.match(out, /0 seams over 6/);
  } finally { server.close(); }
});
