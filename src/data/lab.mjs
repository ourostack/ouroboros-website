// The Lab's pieces and what each one is. The status bar on every /lab/*
// page reads this map. Origin: where the method came from. Experiment: the
// harness itself, still changing. Sub-pages inherit their piece's status.

export const labStatusTones = { Origin: 'tag-today', Experiment: 'tag-alpha' }

export const labPieces = [
  { route: '/lab/story', status: 'Origin' },
  { route: '/lab/why', status: 'Origin' },
  { route: '/lab/what-is-an-agent-harness', status: 'Origin' },
  { route: '/lab/model-reviews', status: 'Experiment' },
  { route: '/lab/docs', status: 'Experiment' },
]

/** The Lab status for a path, or null when the path is not a Lab piece. */
export function labStatusFor(pathname) {
  const path = pathname.replace(/\/+$/, '')
  const piece = labPieces.find(({ route }) => path === route || path.startsWith(`${route}/`))
  return piece ? { status: piece.status, tone: labStatusTones[piece.status] } : null
}
