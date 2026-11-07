// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import codeWrap from './src/lib/code-wrap.mjs';

export default defineConfig({
  site: 'https://ouroboros.bot',
  integrations: [sitemap(), codeWrap()],
  redirects: {
    '/origin': '/blog/build-ai-agent-from-scratch/',
  },
  vite: {
    plugins: [tailwindcss()]
  },
});
