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
  '/favicon.ico',
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
