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
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    dispatch(type, event = {}) { for (const fn of listeners[type] || []) fn(event); },
    focus() { this.focused = true; },
    querySelectorAll: () => [],
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
  const doc = fakeElement('document');
  doc.getElementById = (id) => els[id] || null;
  doc.body = { style: { overflow: '' } };
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
  els['menu-toggle'].dispatch('click');
  assert.equal(els['menu-toggle'].attrs['aria-expanded'], 'false');
  assert.equal(doc.body.style.overflow, '');
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
