// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import codeWrap from './src/lib/code-wrap.mjs';
import pageMarkdown from './src/lib/page-markdown.mjs';

export default defineConfig({
  site: 'https://ouroboros.bot',
  // React renders Ouro HX components on the server. The family bar and footer
  // take no client directive. The agent-loop guide hydrates its shell
  // switcher, code blocks and keys, and the home page its Agent view switch.
  // pageMarkdown writes each page /llms.txt lists as a Markdown twin from its
  // built HTML, after codeWrap has finished with it; src/lib/llms.mjs then
  // writes llms.txt, llms-full.txt and the twins' _headers rules.
  integrations: [sitemap(), codeWrap(), pageMarkdown(), react()],
  redirects: {
    '/origin': '/blog/build-ai-agent-from-scratch/',
  },
  vite: {
    plugins: [tailwindcss()]
  },
});
