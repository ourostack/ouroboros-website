// Every address on ouroboros.bot answers over HTTPS on the apex (Ari, 2026-11-09: "why doesn't http
// forward to https on all these sites?"). This file is two things:
//  - the ouroboros-website-https Worker (wrangler-https.jsonc), whose only routes are
//    http://ouroboros.bot/* and www.ouroboros.bot/*, so it runs for plain-HTTP and www requests
//    alone and the site's HTTPS pages keep coming straight from static assets with no Worker call;
//  - the helpers the site's own Worker (index.ts) uses on the paths it runs first.
// HSTS on static assets comes from public/_headers, because Cloudflare applies _headers only to
// responses the asset layer serves without the Worker.

export const apex = 'ouroboros.bot'
export const hsts = 'max-age=31536000'

/** The https://ouroboros.bot address for a plain-HTTP or www request, or null when the request
    is already canonical or for a host this site doesn't own (workers.dev, preview URLs). */
export function canonicalFor(url) {
  const insecureApex = url.hostname === apex && url.protocol === 'http:'
  if (!insecureApex && url.hostname !== `www.${apex}`) return null
  return `https://${apex}${url.pathname}${url.search}`
}

/** A 301 to the canonical address, path and query kept, or null to fall through. */
export function httpsRedirect(request) {
  const target = canonicalFor(new URL(request.url))
  if (!target) return null
  return new Response(null, { status: 301, headers: { location: target, 'strict-transport-security': hsts } })
}

/** The same response with HSTS added; Response.redirect's headers are immutable, so it copies. */
export function withHsts(response) {
  const headers = new Headers(response.headers)
  headers.set('strict-transport-security', hsts)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request) {
    // Reached only through the routes above, so a canonical request here is a routing mistake.
    return httpsRedirect(request) ?? new Response('Misdirected request', { status: 421 })
  },
}
