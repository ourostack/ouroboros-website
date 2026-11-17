// The blog's posts, newest first: each post's title and description, written
// once. The post's own page, the blog index and /llms.txt all read them here,
// so a post is never named one way on its page and another way in a list.
// Titles are quoted exactly as written; "Trust the Fucking Agent" keeps its
// swear on every surface (Ari, 2026-11-16). `dek` is the line under a post on
// the blog index, where the copy deck gave it one different from the page's
// description; tests/approved-rewrites.test.mjs holds those words.

export const posts = [
  {
    route: '/blog/tell-the-agent/',
    title: 'Tell the agent, not the human',
    description: "When a request breaks, an Ouroboros agent now hears why and gets another try in the same turn. You stop getting notes about your agent's plumbing.",
    author: 'Ari Mendelow',
  },
  {
    route: '/blog/trust-the-agent/',
    title: 'Trust the Fucking Agent',
    description: "We keep doing the agent's job along with our own. Bring judgment, and let the agent do the rest.",
    author: 'Ari Mendelow',
  },
  {
    route: '/blog/take-the-agents-seat/',
    title: "Take the agent's seat",
    description: 'Half of every prompt we send lives in our head. Read what you wrote the way the agent will, before you hit send.',
    author: 'Ari Mendelow',
  },
  {
    route: '/blog/designing-with-your-agent/',
    title: 'The work spoke back',
    description: 'The task scanner produced 184 false errors. Before patching the parser, we asked the agent living inside the system what was actually broken.',
    author: 'Ari Mendelow & Slugger',
  },
  {
    route: '/blog/give-your-agent-a-home/',
    title: 'Give your agent a home',
    description: 'Most AI agents live as scattered files across your filesystem: impermanent, fragile, and forgettable. A bundle changes that. One folder. One identity. One place to back up, move, and grow.',
    dek: 'Most agents live as scattered files across your filesystem. A bundle changes that. One folder, one identity, one place to back up and carry.',
    author: 'Ari Mendelow & Slugger',
  },
  {
    route: '/blog/what-is-agent-experience/',
    title: 'What is Agent Experience (AX)?',
    description: 'Agent Experience is the design surface that appears when an agent has to stay oriented inside the system it inhabits.',
    dek: 'Why long-lived agents become users too: Agent Experience beside HX under UX, reorientation overhead, and shared momentum.',
    author: 'Ari Mendelow',
  },
  {
    route: '/blog/stop-being-the-glue/',
    title: 'Stop being the glue between your agents',
    description: "We were promised an intelligent assistant, and we got a fragmentation of semi-intelligent bots. We became the glue, copy-pasting between tools. Here's what changed.",
    dek: 'We were promised an intelligent assistant, and we got a fragmentation of semi-intelligent bots. How I stopped copy-pasting between my agents and started collaborating.',
    author: 'Ari Mendelow',
  },
  {
    route: '/blog/build-ai-agent-from-scratch/',
    title: 'Just give the model a keyboard',
    description: 'Build an AI agent from scratch, one small step at a time. Learn what an agent loop is and how agents really work, then hand your agent the keyboard and watch it grow itself.',
    dek: 'A one-hour, hands-on walk: you prompt GitHub Copilot CLI to build your own agent loop in TypeScript, a model that can think, remember, read, write, and run commands. Then you hand off to it, and it names itself, writes its own system message, and grows its own skills. No API keys: your GitHub Copilot sign-in is enough.',
    author: 'Ari Mendelow',
    kind: 'Tutorial',
  },
]

/** One post by its route, with or without the trailing slash. */
export function post(route) {
  const found = posts.find((p) => p.route === `${route.replace(/\/+$/, '')}/`)
  if (!found) throw new Error(`Unknown post: ${route}`)
  return found
}
