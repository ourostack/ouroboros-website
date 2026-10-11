import modelReviews from './model-reviews.json'
import { getModelReviewClaims } from '../lib/model-review-claims.mjs'

/*
  Open Graph metadata — single source of truth for every shareable page.

  HOW IT WORKS:
  - Every page route on the site has an entry in `pageOg` below.
  - Each page imports `ogPathFor` and passes the result to <Layout ogImage="...">.
  - The dynamic OG image endpoint at src/pages/og/[...slug].png.ts imports
    this manifest and renders one PNG per entry at build time.
  - On every push to main, Cloudflare Pages runs `astro build`, which
    pre-renders all OG images from this file. Update copy here, ship,
    done — no manual regeneration ever.

  ADDING A NEW PAGE:
  1. Add an entry to pageOg below with the page's route as the key
  2. In the page's Astro frontmatter, import ogPathFor and pass it to Layout:
       import { ogPathFor } from '../data/og'
       const ogImage = ogPathFor('/your-route')
       ...
       <Layout ogImage={ogImage} ...>
  3. Done. Next deploy generates the OG image automatically.

  RULES (matching the design system header at the top of global.css):
  - Sentence case for all titles. NEVER Title Case.
  - Keep the title <70 chars so it stays large on mobile previews.
  - Subtitle is optional, used for context. Keep it <120 chars.
  - Tag is optional, shown as a small uppercase eyebrow above the title.
    IMPORTANT: the tag must make sense when someone sees the OG card in
    isolation (on Twitter, Slack, etc) with NO page context. Don't reuse
    a section eyebrow from inside the page if it'd be confusing without
    that context. e.g. the home page has a "Reviews" section eyebrow but
    the home OG card omits the tag entirely because "Reviews" alone would
    read as "reviews of what?" to a fresh viewer. When in doubt, omit it.
*/

export interface OgEntry {
  title: string
  subtitle?: string
  tag?: string
}

const { winner, allChose, winnerCount, totalReviews } = getModelReviewClaims(modelReviews)
// The Lab card states the method first, then the result, both from the data.
const reviewWinner = winner === 'Ouroboros' ? 'ours' : winner
const labReviewSummary = `We gave frontier models ${modelReviews.harnesses.length} public agent harnesses and asked which they'd choose to work inside. ${allChose ? `Each one tested picked ${reviewWinner}.` : `${winnerCount} of ${totalReviews} tested picked ${reviewWinner}.`}`

export const pageOg: Record<string, OgEntry> = {
  '/': {
    title: 'How do you effectively collaborate with agents?',
    subtitle: "I'm Ari. I build products for humans + agents.",
  },
  '/approach': {
    title: 'How I build with agents.',
    subtitle: 'Three smells and five principles, with my own words for each.',
    tag: 'The approach',
  },
  '/brief': {
    title: 'Hand this to your agent.',
    subtitle: 'Five principles for working with agents, written for your agent to read. No install.',
  },
  '/desk': {
    title: 'Desk: where my agents keep their work.',
    subtitle: 'Give your agent one link and say "set this up". An alpha for Claude Code and GitHub Copilot CLI.',
    tag: 'Desk',
  },
  '/ouro-md': {
    title: 'Ouro MD: read and answer what your agent writes.',
    subtitle: 'A native Markdown editor for macOS 13 or later. Live updates, quiet marks where your agent changed things.',
    tag: 'Ouro MD',
  },
  '/lab': {
    title: 'The harness: where all of this started.',
    subtitle: 'Slugger, the Ouroboros harness, and the model reviews. Our Agent Experience lab.',
    tag: 'Lab',
  },
  '/lab/why': {
    title: 'Persistence is not enough.',
    subtitle: 'Why long-lived agents need structured identity.',
    tag: 'Why Ouroboros',
  },
  '/lab/story': {
    title: 'Code a model can use, not code that uses a model.',
    subtitle: 'How building an AI agent plugin led to building an agent harness from scratch.',
    tag: 'Origin story',
  },
  '/lab/what-is-an-agent-harness': {
    title: 'What is an agent harness?',
    subtitle: 'The system around the loop — runtime, memory, identity, tools, and the workflows that keep an agent oriented across time.',
    tag: 'Guide',
  },
  '/lab/model-reviews': {
    title: 'Which agent harness do frontier models prefer?',
    subtitle: labReviewSummary,
    tag: 'Reviews',
  },
  '/lab/docs': {
    title: 'Docs for humans. Skills for agents.',
    subtitle: 'The website explains the what. Your agent fetches the how.',
    tag: 'Documentation',
  },
  '/blog': {
    title: 'Dispatches from the serpent.',
    subtitle: 'Essays on agent ergonomics, persistent agents, and software shaped for the thing inside it.',
    tag: 'Blog',
  },
  '/blog/trust-the-agent': {
    title: 'Trust the Fucking Agent.',
    subtitle: "We keep doing the agent's job along with our own. Bring judgment, and let the agent do the rest.",
    tag: 'Essay',
  },
  '/blog/take-the-agents-seat': {
    title: "Take the agent's seat.",
    subtitle: 'Half of every prompt we send lives in our head. Read what you wrote the way the agent will, before you hit send.',
    tag: 'Essay',
  },
  '/blog/give-your-agent-a-home': {
    title: 'Give your agent a home.',
    subtitle: 'One folder. One identity. One place to back up, move, and grow.',
    tag: 'Essay',
  },
  '/blog/what-is-agent-experience': {
    title: 'What is Agent Experience (AX)?',
    subtitle: 'The third design surface that appears when an agent has to stay oriented inside the system it inhabits.',
    tag: 'Essay',
  },
  '/blog/designing-with-your-agent': {
    title: 'The work spoke back.',
    subtitle: 'The task scanner produced 184 false errors. Before patching the parser, we asked the agent inside the system what was actually broken.',
    tag: 'Essay',
  },
  '/blog/stop-being-the-glue': {
    title: 'Stop being the glue between your AI tools.',
    subtitle: 'How I stopped copy-pasting between AI tools and started collaborating with one persistent agent.',
    tag: 'Essay',
  },
  '/blog/build-ai-agent-from-scratch': {
    title: 'Build an AI agent in 150 lines of TypeScript.',
    subtitle: 'A practical guide to building agents that read, think, act, and grow — from first principles to production.',
    tag: 'Tutorial',
  },
  '/privacy': {
    title: 'Privacy.',
    subtitle: 'What this site, Desk, the factory, and Ouro MD collect, in plain language.',
  },
  '/terms': {
    title: 'Terms.',
    subtitle: 'The plain-language terms for this site and our open-source tools.',
  },

  // ── Docs sub-pages ──
  '/lab/docs/getting-started': {
    title: 'Get started with Ouroboros in 3 minutes.',
    subtitle: 'Run one command. The serpent guide handles the rest.',
    tag: 'Operator guide',
  },
  '/lab/docs/bundles-and-psyche': {
    title: 'Psyche files — five files that define your agent.',
    subtitle: 'An agent bundle is the portable self. The psyche is the part that helps the agent stay oriented to who it is.',
    tag: 'Operator guide',
  },
  '/lab/docs/continuity-and-memory': {
    title: 'Agent memory that surfaces before you think.',
    subtitle: 'The diary is the shelf, the journal is the desk, habits are the rhythm.',
    tag: 'Operator guide',
  },
  '/lab/docs/architecture': {
    title: 'Heart, mind, senses — code named for the agent inside.',
    subtitle: 'Ouroboros uses a body metaphor because naming and structure affect how an agent navigates the code it has to inhabit.',
    tag: 'Operator guide',
  },
  '/lab/docs/tasks-and-work': {
    title: 'A place to put the work.',
    subtitle: 'Task cards, work directories, a compact board in every prompt, and self-repair tooling when things drift.',
    tag: 'Operator guide',
  },
  '/lab/docs/skills-and-prompts': {
    title: 'Skills vs prompts — when to use each.',
    subtitle: 'Prompts for quick questions. Skills for repeatable operator flows that need the latest local truth.',
    tag: 'Operator guide',
  },
}

// Convert a route path (e.g. '/lab/why' or '/lab/give-your-agent-a-home') to
// the slug used in the OG image filename. Home is special-cased to 'home'.
//
//   '/'                              → 'og-home'
//   '/lab/why'                      → 'og-lab-why'
//   '/lab/give-your-agent-a-home'   → 'og-lab-give-your-agent-a-home'
export function slugFor(routePath: string): string {
  if (routePath === '/' || routePath === '') return 'og-home'
  return 'og-' + routePath.replace(/^\//, '').replace(/\//g, '-')
}

// The full ogImage path the page should pass to <Layout ogImage="...">.
//
//   ogPathFor('/')      → '/og/og-home.png'
//   ogPathFor('/lab/why')   → '/og/og-lab-why.png'
export function ogPathFor(routePath: string): string {
  return `/og/${slugFor(routePath)}.png`
}

// Reverse lookup: given a slug (the URL parameter), find the route path
// that produced it. Used by the OG image endpoint.
export function routePathForSlug(slug: string): string | null {
  for (const route of Object.keys(pageOg)) {
    if (slugFor(route) === slug) return route
  }
  return null
}
