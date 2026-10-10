// The Lab's pieces and what each one is. The Lab index and the status bar on
// every /lab/* page read this map, so a visitor who lands on a Lab page from
// an old link still sees whether it is a running experiment, a tutorial or an
// archive. Sub-pages inherit the status of the piece they belong to.

export const labStatusTones = { Experiment: 'tag-alpha', Tutorial: 'tag-today', Archive: 'tag-exp' }

export const labPieces = [
  { route: '/lab/what-is-agent-experience', status: 'Experiment' },
  { route: '/lab/model-reviews', status: 'Experiment' },
  { route: '/lab/docs', status: 'Experiment' },
  { route: '/lab/give-your-agent-a-home', status: 'Experiment' },
  { route: '/lab/build-ai-agent-from-scratch', status: 'Tutorial' },
  { route: '/lab/why', status: 'Archive' },
  { route: '/lab/story', status: 'Archive' },
  { route: '/lab/what-is-an-agent-harness', status: 'Archive' },
]

/** The Lab status for a path, or null when the path is not a Lab piece. */
export function labStatusFor(pathname) {
  const path = pathname.replace(/\/+$/, '')
  const piece = labPieces.find(({ route }) => path === route || path.startsWith(`${route}/`))
  return piece ? { status: piece.status, tone: labStatusTones[piece.status] } : null
}
