// Site-wide navigation. Nav.astro and Footer.astro both read this list, so
// the two cannot drift. Labels are sentence case (AGENTS.md rule 2).
export const navLinks = [
  { href: '/approach/', label: 'The approach' },
  { href: '/brief/', label: 'Hand this to your agent' },
  { href: '/desk/', label: 'Desk' },
  { href: '/ouro-md/', label: 'Ouro MD' },
  { href: '/essays/', label: 'Essays' },
  { href: '/lab/', label: 'Lab' },
]

export const footerExtraLinks = [
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
]

export const githubOrg = 'https://github.com/ourostack'
