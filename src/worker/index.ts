import { redirectResponse } from './redirects.mjs';
import { hsts, httpsRedirect, withHsts } from './https.mjs';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const insecure = httpsRedirect(request);
    if (insecure) return insecure;

    const moved = redirectResponse(request);
    if (moved) return withHsts(moved);

    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const path = url.pathname;

    // Clone response to modify headers
    const headers = new Headers(response.headers);
    headers.set('X-Worker', 'ouroboros');
    headers.set('Strict-Transport-Security', hsts);

    // Hashed assets (JS/CSS with content hashes) — cache aggressively
    if (path.match(/\/_astro\//)) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Images, fonts — cache for a week
    else if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot|webmanifest)$/)) {
      headers.set('Cache-Control', 'public, max-age=604800');
    }
    // HTML pages — short cache with revalidation
    else if (response.headers.get('content-type')?.includes('text/html')) {
      headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
};
