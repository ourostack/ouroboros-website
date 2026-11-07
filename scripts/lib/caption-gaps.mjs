// Shared by scripts/caption-proximity.mjs and scripts/dramatization.mjs (taste
// review r19, 2026-11-07: on /lab/docs/getting-started/ the DRAMATIZATION
// caption sat 4px above the "Already running?" h2, so it read as that
// heading's label). Runs in the page.
//
// For every visible <figcaption> it returns
//   own:  the gap between the caption and the rest of its figure (the frame),
//   next: the gap between the caption and the nearest visible thing beyond it,
//         on the far side from its figure: text, media, a rule or a tinted
//         band that overlaps the figure horizontally and is not part of it,
//   what: a short label for that nearest thing.
export function captionGaps() {
  const out = [];
  const label = (el) => {
    const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${c}${t ? ` "${t}"` : ''}`;
  };
  const shown = (el) => {
    if (!el.getClientRects().length || el.closest('[hidden], noscript, template, [aria-hidden="true"]')) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    return true;
  };
  const alpha = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c === 'transparent' ? 0 : 1;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    return parts.length > 3 ? parseFloat(parts[3]) : 1;
  };
  const MEDIA = /^(?:IMG|VIDEO|PICTURE|SVG|CANVAS|IFRAME|INPUT|BUTTON|HR|TEXTAREA|SELECT)$/i;
  // Each visible thing's box: the text itself for text, the box for media,
  // the edge for a rule or a tinted band.
  const things = [];
  const range = document.createRange();
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(?:SCRIPT|STYLE|TEMPLATE|NOSCRIPT|BR|WBR)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let boxes = [];
    if (MEDIA.test(el.tagName)) boxes.push(r);
    else {
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.data.trim()) continue;
        range.selectNodeContents(n);
        boxes.push(...[...range.getClientRects()].filter((q) => q.width > 0.5 && q.height > 0.5));
      }
      const s = getComputedStyle(el);
      if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && alpha(s.borderTopColor) > 0.05) boxes.push({ left: r.left, right: r.right, top: r.top, bottom: r.top + 1 });
      if (parseFloat(s.borderBottomWidth) > 0 && s.borderBottomStyle !== 'none' && alpha(s.borderBottomColor) > 0.05) boxes.push({ left: r.left, right: r.right, top: r.bottom - 1, bottom: r.bottom });
      if (alpha(s.backgroundColor) > 0.05 && el !== document.body && el !== document.documentElement) boxes.push(r);
    }
    if (boxes.length) things.push({ el, boxes });
  }
  for (const [index, cap] of [...document.querySelectorAll('figure figcaption')].entries()) {
    if (!shown(cap) || !cap.textContent.trim()) continue;
    const fig = cap.closest('figure');
    // The caption's own extent: its text lines, not its padding.
    const capBoxes = things.find((t) => t.el === cap)?.boxes ?? [];
    for (const d of cap.querySelectorAll('*')) capBoxes.push(...(things.find((t) => t.el === d)?.boxes ?? []));
    if (!capBoxes.length) continue;
    const cTop = Math.min(...capBoxes.map((b) => b.top));
    const cBottom = Math.max(...capBoxes.map((b) => b.bottom));
    let fTop = Infinity;
    let fBottom = -Infinity;
    for (const child of fig.children) {
      if (child === cap || child.contains(cap) || !shown(child)) continue;
      const r = child.getBoundingClientRect();
      if (r.height < 1) continue;
      fTop = Math.min(fTop, r.top);
      fBottom = Math.max(fBottom, r.bottom);
    }
    if (fBottom === -Infinity) continue;
    const below = cTop >= fBottom - 1; // the usual case: the caption under its frame
    const own = Math.round((below ? cTop - fBottom : fTop - cBottom) * 10) / 10;
    const fr = fig.getBoundingClientRect();
    let next = Infinity;
    let what = '';
    for (const t of things) {
      if (fig.contains(t.el) || t.el.contains(fig) || !shown(t.el)) continue;
      for (const b of t.boxes) {
        if (b.right <= fr.left + 1 || b.left >= fr.right - 1) continue;
        const gap = below ? b.top - cBottom : cTop - b.bottom;
        // Things beside the caption (another grid column) or behind it are not "next".
        if (gap < -2) continue;
        if (gap < next) { next = gap; what = label(t.el); }
      }
    }
    out.push({ index, caption: label(cap), drama: /dramatization/i.test(cap.textContent), own, next: Number.isFinite(next) ? Math.round(next * 10) / 10 : null, what, side: below ? 'below' : 'above' });
  }
  return out;
}
