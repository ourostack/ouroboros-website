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

export const footerExtraLinks = [
  { href: '/brief/', label: 'Hand this to your agent' },
  { href: 'https://ourostack.github.io/factory/', label: 'The factory' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
]

export const githubOrg = 'https://github.com/ourostack'
