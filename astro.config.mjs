// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import codeWrap from './src/lib/code-wrap.mjs';

export default defineConfig({
  site: 'https://ouroboros.bot',
  // React renders Ouro HX components on the server. The family bar and footer
  // take no client directive; only the agent-loop guide hydrates its shell
  // switcher and code blocks' Copy buttons, so only that page ships React.
  integrations: [sitemap(), codeWrap(), react()],
  redirects: {
    '/origin': '/blog/build-ai-agent-from-scratch/',
  },
  vite: {
    plugins: [tailwindcss()]
  },
});
