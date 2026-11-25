import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { readBrandPin } from '../scripts/brand-pin.mjs';
import { distDir, distExists } from './support/dist.mjs';

// The brand audit (ourostack/.github brand/tools/audit.mjs) runs from a checkout of the commit
// brand-pin.json records. site-checks.yml checks it out as .brand-dotgithub and sets BRAND_DOTGITHUB;
// a local run points BRAND_DOTGITHUB at a checkout of that commit. GitHub is stubbed in the audit's
// process (tests/support/github-stub.mjs), so nothing here reaches the network.
const root = new URL('..', import.meta.url).pathname;
const checkout = process.env.BRAND_DOTGITHUB ? path.resolve(process.env.BRAND_DOTGITHUB) : null;
if (!checkout && process.env.CI) throw new Error('BRAND_DOTGITHUB must point at the checkout of ourostack/.github that site-checks.yml makes.');
const skip = checkout ? false : "set BRAND_DOTGITHUB to a checkout of ourostack/.github at brand-pin.json's commit";
const scratch = path.join(root, 'node_modules', '.cache', 'brand-audit-test');
const execFileP = promisify(execFile);
const MIME = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

// Serves a built folder at 127.0.0.1, as the audit's --origin reads the site.
function serve(dir) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const candidates = [path.join(dir, pathname), path.join(dir, pathname, 'index.html')];
    const file = candidates.find((f) => f.startsWith(dir) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Runs the audit on one website, the way site-checks.yml does, and returns its exit code and JSON report.
async function audit(origin, dist, stubLog, auditPath = path.join(checkout, 'brand', 'tools', 'audit.mjs')) {
  const env = { ...process.env, GH_TOKEN: 'test-token', STUB_GITHUB_LOG: stubLog };
  delete env.BRAND_REF;
  delete env.BRAND_COMMIT;
  const args = [
    '--import', pathToFileURL(path.join(root, 'tests', 'support', 'github-stub.mjs')).href,
    auditPath,
    '--only', 'site:ouroboros.bot', '--origin', origin, '--dist', dist, '--format', 'json',
  ];
  try {
    const { stdout } = await execFileP('node', args, { env, maxBuffer: 32 * 1024 * 1024 });
    return { code: 0, report: JSON.parse(stdout) };
  } catch (err) {
    if (typeof err.code !== 'number') throw err;
    return { code: err.code, report: JSON.parse(err.stdout) };
  }
}

async function withSite(dist, fn) {
  fs.mkdirSync(scratch, { recursive: true });
  const stubLog = path.join(scratch, `github-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
  const server = await serve(dist);
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`, stubLog);
  } finally {
    server.close();
  }
}

const siteEntry = (report) => report.items.find((item) => item.id === 'site:ouroboros.bot');
const githubRequests = (stubLog) => (fs.existsSync(stubLog) ? fs.readFileSync(stubLog, 'utf8').trim().split('\n').filter(Boolean) : []);

test('the audit checkout is at the commit brand-pin.json records', { skip }, () => {
  const head = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(head, readBrandPin().commit);
});

test('the copies pass against the pinned brand, and the audit reads nothing from main', { skip }, async () => {
  assert.ok(distExists('index.html'), 'dist/ is missing: run npm run build first (npm test does)');
  await withSite(distDir, async (origin, stubLog) => {
    const { code, report } = await audit(origin, distDir, stubLog);
    assert.equal(code, 0, JSON.stringify(siteEntry(report), null, 2));
    assert.equal(siteEntry(report).status, 'current');
    assert.deepEqual(githubRequests(stubLog), [], 'a current site is judged from the checkout alone, never from main');
  });
});

test('a copy that differs from the pinned brand fails the audit', { skip }, async () => {
  assert.ok(distExists('index.html'), 'dist/ is missing: run npm run build first (npm test does)');
  const altered = path.join(scratch, `dist-altered-${process.pid}`);
  fs.rmSync(altered, { recursive: true, force: true });
  fs.cpSync(distDir, altered, { recursive: true });
  fs.appendFileSync(path.join(altered, 'brand/storybook/icons/ouro-180.png'), 'x');
  try {
    await withSite(altered, async (origin, stubLog) => {
      const { code, report } = await audit(origin, altered, stubLog);
      assert.equal(code, 1);
      assert.equal(siteEntry(report).status, 'stale');
      assert.match(siteEntry(report).problems.join('\n'), /build ships \/brand\/storybook\/icons\/ouro-180\.png that is not brand\/icons\/ouro-180\.png/);
    });
  } finally {
    fs.rmSync(altered, { recursive: true, force: true });
  }
});

test('the same copies judged against a brand that moved on main are stale, which is why the audit reads the pin', { skip }, async () => {
  assert.ok(distExists('index.html'), 'dist/ is missing: run npm run build first (npm test does)');
  const moved = path.join(scratch, `brand-moved-${process.pid}`);
  fs.rmSync(moved, { recursive: true, force: true });
  fs.mkdirSync(path.join(moved, 'brand'), { recursive: true });
  fs.cpSync(path.join(checkout, 'brand', 'tools'), path.join(moved, 'brand', 'tools'), { recursive: true });
  fs.copyFileSync(path.join(checkout, 'brand', 'surfaces.json'), path.join(moved, 'brand', 'surfaces.json'));
  // main's newer art: the same file, re-drawn, with its new provenance entry.
  const provenance = JSON.parse(fs.readFileSync(path.join(checkout, 'brand', 'provenance.json'), 'utf8'));
  provenance.find((e) => e.file === 'icons/ouro-180.png').sha256 = createHash('sha256').update('redrawn on main').digest('hex');
  fs.writeFileSync(path.join(moved, 'brand', 'provenance.json'), JSON.stringify(provenance));
  try {
    await withSite(distDir, async (origin, stubLog) => {
      const { code, report } = await audit(origin, distDir, stubLog, path.join(moved, 'brand', 'tools', 'audit.mjs'));
      assert.equal(code, 1);
      assert.equal(siteEntry(report).status, 'stale');
      assert.match(siteEntry(report).problems.join('\n'), /build ships \/brand\/storybook\/icons\/ouro-180\.png that is not brand\/icons\/ouro-180\.png/);
    });
  } finally {
    fs.rmSync(moved, { recursive: true, force: true });
  }
});
