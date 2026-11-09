import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readDist } from './support/dist.mjs';

// The phone menu closes on Escape: aria-expanded goes back to false, the page
// scroll unlocks, and focus returns to the toggle (taste review, 2026-11-06).
// The built page's own inline script runs against a small stand-in DOM.

function menuScript(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const script = scripts.find((s) => s.includes("getElementById('menu-toggle')"));
  assert.ok(script, 'the menu script is in the page');
  return script;
}

function fakeElement(id, classes = []) {
  const set = new Set(classes);
  const listeners = {};
  const attrs = {};
  return {
    id,
    attrs,
    listeners,
    focused: false,
    classList: {
      contains: (c) => set.has(c),
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c, force) => {
        const on = force === undefined ? !set.has(c) : force;
        if (on) set.add(c); else set.delete(c);
        return on;
      },
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k],
    removeAttribute: (k) => { delete attrs[k]; },
    hasAttribute: (k) => k in attrs,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    dispatch(type, event = {}) { for (const fn of listeners[type] || []) fn(event); },
    focus() { this.focused = true; },
    querySelectorAll: () => [],
    children: [],
    get firstElementChild() { return this.children[0] ?? null; },
    contains(node) { return node === this || this.children.some((child) => child === node || child.contains?.(node)); },
  };
}

function boot() {
  const els = {
    'menu-toggle': fakeElement('menu-toggle'),
    'mobile-menu': fakeElement('mobile-menu', ['hidden']),
    'menu-icon-open': fakeElement('menu-icon-open'),
    'menu-icon-close': fakeElement('menu-icon-close', ['hidden']),
  };
  els['menu-toggle'].setAttribute('aria-expanded', 'false');
  // The panel holds a column of links; a tap can land on a link, on the column's
  // open space, on the panel around it, or outside the panel altogether.
  const link = fakeElement('link');
  const column = fakeElement('column');
  column.children.push(link);
  els['mobile-menu'].children.push(column);
  els.link = link;
  els.column = column;
  // The page around the menu: the nav (which holds the bar and the panel), then
  // main, the meadow and the footer, plus the home mark inside the bar.
  const brandHome = fakeElement('brand-home');
  els['main-nav'] = fakeElement('main-nav');
  els['main-nav'].querySelectorAll = (sel) => (sel === '.brand-home' ? [brandHome] : []);
  els['main-nav'].tagName = 'NAV';
  const page = ['main', 'meadow', 'footer'].map((id) => Object.assign(fakeElement(id), { tagName: 'DIV' }));
  els.page = page;
  els.brandHome = brandHome;
  const doc = fakeElement('document');
  doc.getElementById = (id) => els[id] || null;
  doc.documentElement = fakeElement('html');
  doc.body = { style: { overflow: '' }, children: [els['main-nav'], ...page, Object.assign(fakeElement('s'), { tagName: 'SCRIPT' })] };
  const window = { matchMedia: () => ({ matches: false, addEventListener() {} }) };
  vm.runInNewContext(menuScript(readDist('index.html')), { document: doc, window });
  return { els, doc };
}

test('the phone menu opens and closes from its toggle', () => {
  const { els, doc } = boot();
  els['menu-toggle'].dispatch('click');
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'true');
  assert.equal(els['mobile-menu'].classList.contains('hidden'), false);
  assert.equal(doc.body.style.overflow, 'hidden');
  // html carries overflow-x: clip, so body's overflow never reaches the
  // viewport: the viewport itself locks (taste review r7: the page scrolled behind the menu).
  assert.equal(doc.documentElement.classList.contains('menu-open'), true);
  els['menu-toggle'].dispatch('click');
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'false');
  assert.equal(doc.body.style.overflow, '');
  assert.equal(doc.documentElement.classList.contains('menu-open'), false);
});

test('Escape closes the phone menu, unlocks scroll and returns focus to the toggle', () => {
  const { els, doc } = boot();
  els['menu-toggle'].dispatch('click');
  doc.dispatch('keydown', { key: 'Escape' });
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'false');
  assert.equal(els['mobile-menu'].classList.contains('hidden'), true);
  assert.equal(els['menu-icon-open'].classList.contains('hidden'), false);
  assert.equal(els['menu-icon-close'].classList.contains('hidden'), true);
  assert.equal(doc.body.style.overflow, '');
  assert.equal(els['menu-toggle'].focused, true);
});

test('Escape with the menu shut does nothing and steals no focus', () => {
  const { els, doc } = boot();
  doc.dispatch('keydown', { key: 'Escape' });
  assert.equal(els['menu-toggle'].focused, false);
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'false');
});

test('a tap outside the links closes the phone menu and returns focus; a tap on the toggle is left to the toggle', () => {
  for (const where of ['column', 'mobile-menu', 'outside']) {
    const { els, doc } = boot();
    els['menu-toggle'].dispatch('click');
    const target = where === 'outside' ? fakeElement('page') : els[where];
    doc.dispatch('click', { target });
    assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'false', `a tap on ${where} closes it`);
    assert.equal(doc.body.style.overflow, '');
    assert.equal(els['menu-toggle'].focused, true);
  }
  const { els, doc } = boot();
  els['menu-toggle'].dispatch('click');
  doc.dispatch('click', { target: els['menu-toggle'] });
  doc.dispatch('click', { target: els.link });
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'true', 'the toggle and a link handle their own taps');
});

// Taste review r4: Tab moved to page links hidden behind the open menu. While it
// is open, everything outside it is inert; closing wakes the page and returns
// focus to the toggle.
test('while the phone menu is open, the page behind it is inert', () => {
  for (const close of ['toggle', 'Escape', 'outside']) {
    const { els, doc } = boot();
    els['menu-toggle'].dispatch('click');
    for (const el of [...els.page, els.brandHome]) assert.ok(el.hasAttribute('inert'), `${el.id} is inert while the menu is open`);
    assert.ok(!els['main-nav'].hasAttribute('inert'), 'the nav holding the menu and its toggle stays live');
    if (close === 'toggle') els['menu-toggle'].dispatch('click');
    else if (close === 'Escape') doc.dispatch('keydown', { key: 'Escape' });
    else doc.dispatch('click', { target: fakeElement('page') });
    for (const el of [...els.page, els.brandHome]) assert.ok(!el.hasAttribute('inert'), `${el.id} wakes when the menu closes by ${close}`);
    assert.equal(els['menu-toggle'].focused, true, `focus returns to the toggle after ${close}`);
  }
});

// The site's own sections share one size; the family's sites, under them,
// share their own, smaller one (the family pass, 2026-11-08).
test('every section in the phone menu is set in the same size, and so is every family site', () => {
  const html = readDist('index.html');
  const panel = html.match(/<div id="mobile-menu"[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>/)[0];
  const sections = panel.slice(0, panel.indexOf('<ul class="menu-family"'));
  const sizes = [...sections.matchAll(/<a\b[^>]*class="([^"]*)"/g)].map(([, c]) => (c.match(/\btext-(xl|2xl|3xl|4xl)\b/) || [])[1]);
  assert.equal(sizes.length, 4, 'found the four sections');
  assert.deepEqual([...new Set(sizes)], ['3xl']);
  const family = panel.slice(panel.indexOf('<ul class="menu-family"'));
  assert.equal([...family.matchAll(/<a\b/g)].length, 7, 'found the seven family sites');
  assert.doesNotMatch(family, /class="[^"]*\btext-/, 'the family links take one size, from .menu-family');
});

// Taste review r6: page text read through the bottom of the open menu at 390,
// light theme most of all. The panel is a solid sheet, so nothing shows through.
test('the open phone menu is fully opaque', () => {
  const html = readDist('index.html');
  const open = html.match(/<div id="mobile-menu" class="([^"]*)"/)[1].split(/\s+/);
  assert.ok(open.includes('bg-deep'), 'the panel takes the solid page colour');
  assert.ok(!open.some((c) => /^bg-[\w-]+\/\d+$/.test(c) || /^backdrop-/.test(c) || /^opacity-/.test(c)), `no see-through class on the panel: ${open.join(' ')}`);
});
