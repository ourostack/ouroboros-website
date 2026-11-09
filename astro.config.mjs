// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import codeWrap from './src/lib/code-wrap.mjs';

export default defineConfig({
  site: 'https://ouroboros.bot',
  // React renders Ouro HX components (the family bar and footer) on the server;
  // none takes a client directive, so no page ships React.
  integrations: [sitemap(), codeWrap(), react()],
  redirects: {
    '/origin': '/blog/build-ai-agent-from-scratch/',
  },
  vite: {
    plugins: [tailwindcss()]
  },
});
