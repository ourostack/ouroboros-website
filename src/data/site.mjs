// Site-wide navigation. Nav.astro and Footer.astro both read this list, so
// the two cannot drift. Labels are sentence case (AGENTS.md rule 2).
export const navLinks = [
  { href: '/approach/', label: 'Approach' },
  { href: '/desk/', label: 'Desk' },
  { href: '/ouro-md/', label: 'Ouro MD' },
  { href: '/lab/story/', label: 'Story' },
  { href: '/lab/', label: 'Lab' },
  { href: '/blog/', label: 'Blog' },
]

export const githubOrg = 'https://github.com/ourostack'

// The sister site: the last nav item, and the footer row (shared kit, copy deck 2026-10-11).
export const sisterNav = { href: 'https://mendelow.me', label: 'About me ↗' }
export const footerLine = 'You bring judgment. Your agents bring the rest.'
// On ouroboros.bot the row also carries Privacy and Terms, which Ouro MD and the
// hosted Desk depend on, and GitHub goes to the ourostack organization (ruling 2026-10-11).
export const footerRow = [
  { href: 'https://mendelow.me', label: 'mendelow.me' },
  { href: githubOrg, label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/arimendelow', label: 'LinkedIn' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
]
