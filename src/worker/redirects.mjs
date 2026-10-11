// Old URLs sent to their new homes with a 301. Published posts keep their
// /blog/ URLs; the harness pages moved under /lab/. The /essays/ paths only
// ever existed on a preview, so they fold back into /blog/.
const moved = [
  [/^\/(docs|model-reviews|story|why|what-is-an-agent-harness)(\/.*)?$/, '/lab/$1$2'],
  [/^\/essays(\/.*)?$/, '/blog$1'],
  [/^\/lab\/(what-is-agent-experience|give-your-agent-a-home|build-ai-agent-from-scratch)\/?$/, '/blog/$1/'],
]

/** The new path for an old one, or null. Page paths end in a slash, so a
    redirect lands in one hop instead of bouncing through the asset layer. */
export function redirectFor(pathname) {
  for (const [pattern, target] of moved) {
    if (!pattern.test(pathname)) continue
    const next = pathname.replace(pattern, target)
    const last = next.slice(next.lastIndexOf('/') + 1)
    return next.endsWith('/') || last.includes('.') ? next : `${next}/`
  }
  return null
}

/** A 301 to the new home, keeping the query string, or null to fall through. */
export function redirectResponse(request) {
  const url = new URL(request.url)
  const moved = redirectFor(url.pathname)
  if (!moved) return null
  const target = new URL(moved, url)
  target.search = url.search
  return Response.redirect(target.toString(), 301)
}
