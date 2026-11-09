// Site-wide navigation. Nav.astro and Footer.astro both read this file, so
// the two cannot drift. Labels are sentence case (AGENTS.md rule 2).
import family from './family.json' with { type: 'json' }

// The public Ouro family (src/data/family.json, a byte-for-byte copy of
// ourostack/.github brand/family.json): the family bar above the nav and the
// family row in the footer list these, in this order, on every family site.
// Ouro UI, Ouro MD, Desk, Apps, Ari Mendelow and GitHub live there, so the
// site's own nav never repeats them (Ari, 2026-11-08: "we have ouro md but not
// ouro ui in ouroboros header??").
export const familyLinks = family.links

/** The family item this page belongs to: Ouro MD, Desk or Apps under their own paths, Ouro everywhere else. */
export function familyCurrent(pathname) {
  for (const id of ['ouro-md', 'desk', 'apps']) if (pathname === `/${id}` || pathname.startsWith(`/${id}/`)) return id
  return 'ouro'
}

// The site's own sections, under the family bar.
export const navLinks = [
  { href: '/approach/', label: 'How I work' },
  { href: '/lab/', label: 'Lab' },
  { href: '/blog/', label: 'Blog' },
  { href: '/#try', label: 'Try it' },
]

export const footerLine = 'You bring judgment. Your agents bring the rest.'
// The site's own extras in the footer, after the family row. Privacy and Terms
// are here because Ouro MD and the hosted Desk depend on them (ruling 2026-10-11).
export const footerExtras = [
  { href: 'https://www.linkedin.com/in/arimendelow', label: 'LinkedIn' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
]
