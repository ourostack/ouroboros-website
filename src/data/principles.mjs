// Ari's five principles plus the proposed sixth. Titles are verbatim from the
// approach draft; summaries are the short card copy from the homepage mockup.
// The approach page anchors each section with `id`, so homepage cards can
// deep-link to /approach/#<id>.
export const principles = [
  {
    id: 'intent-and-judgement',
    n: '1',
    title: 'Talk through intent and judgement together',
    summary: "The planning is collaborative and the doing is delegated. The agent's confident first answer is a draft to push on.",
  },
  {
    id: 'whole-outcomes',
    n: '2',
    title: 'Delegate whole outcomes, not steps',
    summary: "Say what done looks like and why it matters. The steps are the agent's, including the awkward ones.",
  },
  {
    id: 'durable-context',
    n: '3',
    title: 'Make context durable',
    summary: 'Decisions live in files the next session reads, not in a chat that ends. Teaching it twice means the record is missing something.',
  },
  {
    id: 'authority-and-boundaries',
    n: '4',
    title: 'Give agents meaningful authority, with clear boundaries',
    summary: "Name the few things only you can do. Everything else is the agent's, and what it does stays visible.",
  },
  {
    id: 'verify-the-result',
    n: '5',
    title: 'Verify the actual result, not plausible progress',
    summary: 'Look where the result lives: the live page, the installed app, the merged change.',
  },
]

export const proposedPrinciple = {
  id: 'fix-the-system',
  n: 'Act 3 · proposed',
  title: 'Fix the system, not the instance',
  summary: "When a smell shows up, change the setup so the next agent doesn't hit it. This is where Act 3 begins.",
}

export const smells = [
  { name: "You're doing it by hand.", short: 'Anything the agent could have done.' },
  { name: "You're teaching it twice.", short: 'The same correction, session after session.' },
  { name: 'Control keeps coming back to you.', short: "You've become an approval button on a loop." },
]

export const factoryUrl = 'https://ourostack.github.io/factory/'
export const deskSetupUrl = 'https://github.com/ourostack/desk/blob/main/SETUP.md'
export const ouroMdInstall = 'curl -fsSL https://ouro.bot/ouro-md-install.sh | bash'
export const rfcUrl = 'https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'
