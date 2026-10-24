// The three acts, verbatim from the copy deck (round 2, 2026-10-11). The
// homepage and /approach/ both read this list, so the two cannot drift.
//
// Each body is a list of parts: plain text, or { text, href } for a link
// (root misses rulings 3.1, 2.15 and 3.2). The factory link points at the
// homepage's factory section; on the homepage itself it stays on the page.
export const acts = [
  { name: 'Capability.', body: ["Getting an agent to do anything you can do on a computer. That's been solved for a while."] },
  { name: 'Orientation.', body: ["Keeping an agent clear on who it is, who it's working with, and what the work is, from one session to the next. Most of what I've built is about this, starting with ", { text: 'Desk', href: '/desk/' }, '.'] },
  { name: 'Work design.', body: ["Designing and measuring how agents get their work done. The industry is just starting to move into this one, and it's what ", { text: 'the factory', href: '/#factory' }, ' is for.'] },
]

// The plain text of an act's body.
export const actText = (act) => act.body.map((part) => (typeof part === 'string' ? part : part.text)).join('')
