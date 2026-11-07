// Site-wide navigation. Nav.astro and Footer.astro both read this list, so
// the two cannot drift. Labels are sentence case (AGENTS.md rule 2).
export const navLinks = [
  { href: '/approach/', label: 'How I work' },
  { href: '/desk/', label: 'Desk' },
  { href: '/ouro-md/', label: 'Ouro MD' },
  { href: '/lab/', label: 'Lab' },
  { href: '/blog/', label: 'Blog' },
  // The apps shelf moved here from ouro.bot, which now forwards to ouroboros.bot
  // (Ari, 2026-11-06: "we need a unified domain"). Ouro MD's download page followed
  // on 2026-11-07, to /ouro-md/download/.
  { href: '/apps/', label: 'Apps' },
  { href: '/#try', label: 'Try it' },
]

export const githubOrg = 'https://github.com/ourostack'

// The sister site: the last nav item, and the footer row (shared kit, copy deck 2026-10-11).
export const sisterNav = { href: 'https://mendelow.me', label: 'About me ↗' }
export const footerLine = 'You bring judgment. Your agents bring the rest.'
// On ouroboros.bot the row also carries Privacy and Terms, which Ouro MD and the
// hosted Desk depend on, and GitHub goes to the ourostack organization (ruling 2026-10-11).
export const footerRow = [
  { href: 'https://mendelow.me', label: 'mendelow.me' },
  { href: githubOrg, label: 'ourostack on GitHub' },
  { href: 'https://www.linkedin.com/in/arimendelow', label: 'LinkedIn' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
]
