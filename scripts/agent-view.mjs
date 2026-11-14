// Real-browser check of the home page's Agent view (src/components/AgentView.astro):
//  - the nav's switch is named "Agent view", works from the keyboard and keeps focus;
//  - turned on, the page gives way to /index.md exactly as the server sends it,
//    with the response's real status, and the screen reader's status line says so;
//  - the heading you were reading stays where it was, both ways;
//  - nothing runs wider than the screen;
//  - without scripts, a plain link to /index.md takes the switch's place.
// At 390x844 and 1440x900, with reduced motion and without it.
//
//   npm run build && node scripts/agent-view.mjs
//   node scripts/agent-view.mjs --base https://ouroboros.bot   (a live site)
//
// Uses Playwright's chromium; override with CHROME_PATH.

import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
let base = opt('--base')?.replace(/\/$/, '');
let server;
if (!base) {
  server = await serveDist({ port: 6214 });
  base = server.base;
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const failures = [];
const near = (a, b) => Math.abs(a - b) <= 24;

for (const [width, height] of [[390, 844], [1440, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const at = `${width}x${height} (${motion} motion)`;
    const fail = (message) => failures.push(`${at}: ${message}`);
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, isMobile: width < 600, hasTouch: width < 600 });
    const p = await ctx.newPage();
    await p.route(/\.(?:avif|webp|jpg|png|mp4|webm)$/, (r) => r.abort());
    await p.goto(`${base}/`, { waitUntil: 'load' });
    await p.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 15000 });
    const sw = p.getByRole('switch', { name: 'Agent view' });
    if (!(await sw.isVisible())) fail('no visible switch named "Agent view"');
    if (await p.locator('.agent-view-fallback').isVisible()) fail('the no-script link shows beside the switch');

    // Read from the second section's heading, then flip with the keyboard.
    const heading = 'Built by watching agents work';
    await p.evaluate(() => { const h = document.getElementById('built-heading'); window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - 140, behavior: 'instant' }); });
    await p.waitForTimeout(200);
    const before = await p.evaluate(() => document.getElementById('built-heading').getBoundingClientRect().top);
    await sw.focus();
    await p.keyboard.press('Space');
    await p.waitForFunction(() => document.documentElement.hasAttribute('data-agent-view'), null, { timeout: 5000 }).catch(() => fail('Space did not turn Agent view on'));
    await p.waitForTimeout(700);
    const on = await p.evaluate(async (wanted) => {
      const doc = document.querySelector('[data-agent-doc]');
      const served = await (await fetch('/index.md', { cache: 'no-cache' })).text();
      const line = [...doc.querySelectorAll('[data-heading]')].find((h) => h.textContent.endsWith(wanted));
      return {
        checked: document.querySelector('[role="switch"]').getAttribute('aria-checked'),
        focused: document.activeElement?.getAttribute('role'),
        same: doc.textContent === served.replace(/\n$/, ''),
        response: document.querySelector('[data-agent-response]').textContent,
        status: document.querySelector('[data-agent-view-status]').textContent,
        page: document.querySelector('main#main > .page-hero')?.getClientRects().length ?? -1,
        line: line?.getBoundingClientRect().top,
        wide: document.documentElement.scrollWidth - innerWidth,
      };
    }, heading);
    if (on.checked !== 'true') fail(`the switch reads aria-checked=${on.checked} after turning on`);
    if (on.focused !== 'switch') fail(`focus moved to ${on.focused} instead of staying on the switch`);
    if (!on.same) fail('the text shown is not /index.md as served');
    if (!/→ 200 · text\/markdown · [\d.]+ KB · \d+ ms/.test(on.response)) fail(`the response line reads "${on.response}"`);
    if (!/^Agent view on/.test(on.status)) fail(`the status line reads "${on.status}"`);
    if (on.page !== 0) fail('the page still shows under the agent view');
    if (on.line === undefined || !near(on.line, before)) fail(`"## ${heading}" sits at ${Math.round(on.line)}, not where the heading was (${Math.round(before)})`);
    if (on.wide > 0) fail(`the agent view runs ${on.wide}px wider than the screen`);

    await p.keyboard.press('Space');
    await p.waitForTimeout(700);
    const off = await p.evaluate(() => ({
      on: document.documentElement.hasAttribute('data-agent-view'),
      hidden: document.getElementById('agent-view').hidden,
      status: document.querySelector('[data-agent-view-status]').textContent,
      top: document.getElementById('built-heading').getBoundingClientRect().top,
    }));
    if (off.on || !off.hidden) fail('Space did not turn Agent view off');
    if (!/^Agent view off/.test(off.status)) fail(`the status line reads "${off.status}" after turning off`);
    if (!near(off.top, before)) fail(`back on the page, "${heading}" sits at ${Math.round(off.top)}, not ${Math.round(before)}`);
    console.log(`${at}: on and off by keyboard, ${on.response.trim()}, heading kept at ${Math.round(before)} → ${Math.round(on.line)} → ${Math.round(off.top)}`);
    await ctx.close();
  }
}

// Without scripts the switch can't work, so a link to the same file shows instead.
for (const [width, height] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(`${base}/`, { waitUntil: 'load' });
  const link = p.locator('a.agent-view-fallback');
  if (!(await link.isVisible())) failures.push(`${width}x${height} without scripts: no visible Agent view link`);
  if ((await link.getAttribute('href')) !== '/index.md') failures.push(`${width}x${height} without scripts: the link goes to ${await link.getAttribute('href')}`);
  if (await p.locator('.agent-view-switch').isVisible()) failures.push(`${width}x${height} without scripts: the dead switch shows`);
  await ctx.close();
}

const res = await fetch(`${base}/index.md`);
if (!res.ok || !/^text\/markdown/.test(res.headers.get('content-type') ?? '')) failures.push(`/index.md answers ${res.status} ${res.headers.get('content-type')}`);

await browser.close();
server?.close();
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
