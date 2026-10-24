// Ari's five principles. Titles are his originals, verbatim from the copy deck
// (2026-10-11).
// The approach page anchors each section with `id`, so homepage cards can
// deep-link to /approach/#<id>.
export const principles = [
  {
    id: 'intent-and-judgement',
    n: '1',
    title: 'Talk through intent and judgment',
  },
  {
    id: 'whole-outcomes',
    n: '2',
    title: 'Delegate whole outcomes',
  },
  {
    id: 'durable-context',
    n: '3',
    title: 'Make context durable',
  },
  {
    id: 'authority-and-boundaries',
    n: '4',
    title: 'Give agents meaningful authority, with clear boundaries',
  },
  {
    id: 'verify-the-result',
    n: '5',
    title: 'Verify the actual result',
  },
]

export const smells = [
  { name: "You're doing it by hand.", short: 'Anything the agent could have done.' },
  { name: "You're teaching it twice.", short: 'The same correction, session after session.' },
  { name: 'Control keeps coming back to you.', short: "You've become an approval button on a loop." },
]

export const factoryUrl = 'https://ourostack.github.io/factory/'
export const deskSetupUrl = 'https://github.com/ourostack/desk/blob/main/SETUP.md'
export const ouroMdInstall = 'curl -fsSL https://ouro.bot/ouro-md-install.sh | bash'
export const rfcUrl = 'https://github.com/ourostack/desk/blob/main/plugins/desk/docs/agentic-engineering-v2-rfc.md'
