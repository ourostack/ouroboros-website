// Readiness: the one place a page may get a status label from.
//
// The label words are fixed. No page may call anything "stable",
// "supported" or "production-ready", because nothing we ship has earned
// those words yet. tests/readiness.test.mjs enforces both rules against this
// module and against every built page. Re-check each detail before publishing.

export const allowedLabels = {
  'Alpha': 'tag-alpha',
  'Use today': 'tag-today',
  'Experimental': 'tag-exp',
  'Not open yet': 'tag-closed',
}

/** @type {{ id: string, name: string, label: keyof typeof allowedLabels, detail: string }[]} */
export const readiness = [
  { id: 'desk-claude-code-macos', name: 'Claude Code on macOS', label: 'Alpha', detail: 'Tested daily' },
  { id: 'desk-claude-code-linux', name: 'Claude Code on Linux', label: 'Alpha', detail: 'Full test suite runs in CI' },
  { id: 'desk-claude-code-windows', name: 'Claude Code on Windows', label: 'Alpha', detail: 'Full test suite runs in CI' },
  { id: 'desk-copilot-cli', name: 'GitHub Copilot CLI', label: 'Alpha', detail: 'Tested daily' },
  { id: 'desk-codex', name: 'Codex', label: 'Experimental', detail: "Runs, and hasn't been proven in daily use yet" },
  { id: 'desk-hosted', name: 'Hosted Desk on claude.ai', label: 'Not open yet', detail: 'No sign-up yet' },
  { id: 'ouro-md', name: 'Ouro MD', label: 'Use today', detail: 'macOS 13 or later' },
  { id: 'harness', name: 'The Ouroboros harness', label: 'Experimental', detail: 'Our Agent Experience lab' },
]

export function entry(id) {
  const found = readiness.find((item) => item.id === id)
  if (!found) throw new Error(`Unknown readiness id: ${id}`)
  return found
}

export function labelFor(id) {
  const { label } = entry(id)
  return { label, tone: allowedLabels[label] }
}

export const deskHosts = readiness.filter((item) => item.id.startsWith('desk-'))
