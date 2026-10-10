// Old URLs from the harness-first site, sent to their new homes with a 301.
const moved = [
  [/^\/blog\/(stop-being-the-glue|designing-with-your-agent)\/?$/, '/essays/$1/'],
  [/^\/blog\/(what-is-agent-experience|give-your-agent-a-home|build-ai-agent-from-scratch)\/?$/, '/lab/$1/'],
  [/^\/blog\/?$/, '/essays/'],
  [/^\/(docs|model-reviews|story|why|what-is-an-agent-harness)(\/.*)?$/, '/lab/$1$2'],
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
