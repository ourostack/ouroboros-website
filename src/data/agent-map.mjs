// What /llms.txt lists, in order, and so which pages get a Markdown twin.
//
// Only routes and names live here. src/lib/llms.mjs reads each page's title and
// description from the built page itself, so the map can't say anything the
// page doesn't. tests/llms.test.mjs fails the build when a blog or Lab page is
// missing, or listed under a title its page doesn't carry.
import { posts } from './blog.mjs'
import { labPieces, labDocs } from './lab.mjs'

export const SITE = 'https://ouroboros.bot'

const slash = (route) => `${route.replace(/\/+$/, '')}/`

/** The pages listed by their own title and description, each section in order. */
export const pageSections = [
  // The brief's twin is brief.md, which the brief page shows word for word.
  { heading: 'Start here', routes: ['/brief/', '/approach/', '/'] },
  { heading: 'Essays', routes: ['/blog/', ...posts.map((p) => p.route)] },
  { heading: 'Lab', routes: ['/lab/', ...labPieces.map((p) => slash(p.route))] },
  { heading: 'Ouroboros harness docs', routes: labDocs.map(slash) },
]

/**
 * One line per tool. A tool with a page here is described by that page's own
 * description; one that lives elsewhere links its own llms.txt where it has one,
 * with a note, since this site has no page to quote. `readiness` is an id in
 * src/data/readiness.mjs, the only source of a status label.
 */
export const tools = [
  { name: 'Desk', route: '/desk/' },
  { name: 'Ouro MD', route: '/ouro-md/', readiness: 'ouro-md' },
  { name: 'Ouro Shepherd', route: '/shepherd/', readiness: 'shepherd' },
  { name: 'Ouro Butler', route: '/butler/', readiness: 'butler' },
  { name: 'housesitter', route: '/housesitter/', readiness: 'housesitter' },
  { name: 'Apps', route: '/apps/' },
  {
    name: 'Ouro UI', href: 'https://ui.ouroboros.bot/llms.txt', readiness: 'ouro-hx',
    note: 'The home of Ouro HX, a React component library for the humans using an interface and the agents building it, with its showcase (https://ui.ouroboros.bot/voyage/) and how to install it. Ouro AX gives the doors an agent walks through, such as CLIs and MCP servers, the same care: each gets a sign, and CI counts any still bare (https://ui.ouroboros.bot/ax/).',
  },
  { name: 'The factory', href: 'https://ourostack.github.io/factory/llms.txt', readiness: 'factory', note: 'Our public record of how agent work actually goes.' },
  { name: 'm365crawl', href: 'https://github.com/ourostack/m365crawl', note: 'A local, searchable archive of Teams chats, Outlook mail, and meetings for an agent.' },
  { name: 'Spoonjoy', href: 'https://spoonjoy.app/llms.txt', note: 'A recipe app an agent can drive through its MCP server.' },
]

/** Every page with a Markdown twin: each listed page, and each tool's page. */
export const twinRoutes = [...new Set([...pageSections.flatMap((s) => s.routes), ...tools.filter((t) => t.route).map((t) => t.route)])]

/** A page's Markdown twin, as a path on the site, or null when it has none. */
export function twinFor(pathname) {
  const route = slash(pathname)
  if (route === '/brief/') return '/brief.md'
  return twinRoutes.includes(route) ? `${route}index.md` : null
}
