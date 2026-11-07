import assert from 'node:assert/strict';
import test from 'node:test';
import { readDist, distExists } from './support/dist.mjs';

// ouro.bot forwards its old pages here (ourostack/ouro-apps-site worker.js, the
// `forwards` map; Ari, 2026-11-06: "we need a unified domain"). Each destination
// must exist in the built site, so moving or deleting one of these pages fails
// here before a visitor from ouro.bot lands on a 404. Keep this list in step with
// that map; its own test checks the same destinations against the live site.
const destinations = [
  '/',
  '/apps/',
  '/apps/#ouro-md',
  '/apps/#shepherd',
  '/apps/#ouro-hx',
  '/ouro-hx/',
  '/ouro-hx/#install',
  '/favicon.ico',
  // Ouro MD's download page and its files (moved 2026-11-07).
  '/ouro-md/',
  '/ouro-md/download/',
  '/ouro-md/download/#install',
  '/ouro-md/stable.json',
  '/ouro-md-install.sh',
  '/robots.txt',
  '/sitemap-index.xml',
  '/brand/ouro-md-icon.png',
  '/brand/ouro.svg',
  '/brand/ouro-render.webp',
  '/brand/ouro-render-128.webp',
  '/brand/ouro-render-256.webp',
  '/brand/ouro-hx-render-128.webp',
  '/brand/ouro-hx-render-256.webp',
  '/brand/shepherd-render.webp',
  '/brand/shepherd-render-128.webp',
  '/brand/shepherd-render-256.webp',
  '/fonts/cormorant-regular.woff2',
  '/fonts/jetbrains-mono.woff2',
  '/fonts/outfit.woff2',
  '/og/og-ouro-hx.jpg',
  '/images/workshop/ouro-md-editing.png',
  '/images/workshop/ouro-hx-spoonjoy-xray-dark.webp',
  '/images/workshop/ouro-hx-spoonjoy-xray-light.webp',
  '/images/workshop/ouro-hx-spoonjoy-xray-provenance.json',
  ...['typing', 'agent-edit'].flatMap((clip) => ['light', 'dark'].flatMap((theme) => [
    `/images/workshop/ouro-md-${clip}-${theme}.mp4`,
    `/images/workshop/ouro-md-${clip}-${theme}.webm`,
    `/images/workshop/ouro-md-${clip}-${theme}-poster.png`,
  ])),
];

const fileFor = (pathname) => (pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1));

for (const destination of destinations) {
  test(`ouro.bot forward target ${destination} exists`, () => {
    const [pathname, fragment] = destination.split('#');
    const file = fileFor(pathname);
    assert.ok(distExists(file), `dist/${file} is missing`);
    if (fragment) assert.match(readDist(file), new RegExp(`id="${fragment}"`), `${pathname} has no #${fragment}`);
  });
}
