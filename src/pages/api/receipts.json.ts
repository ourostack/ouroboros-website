import type { APIRoute } from 'astro'
import { buildReceipts } from '../../lib/build-receipts.mjs'

// The build's own answer at /api/receipts.json. In production the Worker answers this path
// first (src/worker/receipts.mjs) and serves this file only when GitHub can't be reached and
// it has no newer answer cached; a static server (the page checks, astro preview) serves it as is.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildReceipts ?? { error: 'No receipts at build time' }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
