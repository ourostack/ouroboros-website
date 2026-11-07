// Old URLs sent to their new homes with a 301. Published posts keep their
// /blog/ URLs; the harness pages moved under /lab/. The /essays/ paths only
// ever existed on a preview, so they fold back into /blog/.
const moved = [
  [/^\/(docs|model-reviews|story|why|what-is-an-agent-harness)(\/.*)?$/, '/lab/$1$2'],
  [/^\/essays(\/.*)?$/, '/blog$1'],
  [/^\/lab\/(what-is-agent-experience|give-your-agent-a-home|build-ai-agent-from-scratch)\/?$/, '/blog/$1/'],
  // Share cards already posted keep their image: the old card names gained "lab-".
  [/^\/og\/og-(docs(?:-[a-z-]+)?|model-reviews|story|why|what-is-an-agent-harness)\.png$/, '/og/og-lab-$1.jpg'],
  // Ouro HX's page moved to the Ouro UI site (below); a share card already posted for it shows that site's own card.
  [/^\/og\/og-ouro-hx\.(?:jpg|png)$/, 'https://ui.ouroboros.bot/og/home.jpg'],
  // The storybook cards (2026-11-06) are JPEGs; a card already posted as .png finds its new self.
  [/^\/og\/(og-[a-z0-9-]+)\.png$/, '/og/$1.jpg'],
  // Crawlers and people try /sitemap.xml first; the sitemap is the index the
  // build writes (taste review r17: /sitemap.xml served the 404 page).
  [/^\/sitemap\.xml$/, '/sitemap-index.xml'],
  // Ouro HX's page joined the Ouro UI site, its one home for HX, UI and AX (Ari, 2026-11-07: "let's unify").
  [/^\/ouro-hx(?:\/(?:index\.html)?)?$/, 'https://ui.ouroboros.bot/'],
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
