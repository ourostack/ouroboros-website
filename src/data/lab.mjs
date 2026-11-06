// The Lab's pieces and what each one is. The status bar on every /lab/*
// page reads this map. Origin: where the method came from. Experimental: the
// harness itself, still changing. Sub-pages inherit their piece's status.

// "Experimental", the readiness word (src/data/readiness.mjs), so one word means one
// thing on every page (taste review r5: "Experiment" here, "Experimental" there).
export const labStatusTones = { Origin: 'tag-today', Experimental: 'tag-exp' }

export const labPieces = [
  { route: '/lab/story', status: 'Origin' },
  { route: '/lab/how-desk-started', status: 'Origin' },
  { route: '/lab/why', status: 'Origin' },
  { route: '/lab/what-is-an-agent-harness', status: 'Origin' },
  { route: '/lab/model-reviews', status: 'Experimental' },
  { route: '/lab/docs', status: 'Experimental' },
]

/** The Lab status for a path, or null when the path is not a Lab piece. */
export function labStatusFor(pathname) {
  const path = pathname.replace(/\/+$/, '')
  const piece = labPieces.find(({ route }) => path === route || path.startsWith(`${route}/`))
  return piece ? { status: piece.status, tone: labStatusTones[piece.status] } : null
}
