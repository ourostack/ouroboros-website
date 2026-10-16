# ouroboros.bot

How to collaborate with agents: Ari Mendelow's approach, the tools that support it ([Desk](https://github.com/ourostack/desk), [Ouro MD](https://github.com/ourostack/ouro-md) and [the factory](https://ourostack.github.io/factory/)), the blog, and the Lab: the [Ouroboros harness](https://github.com/ourostack/ouroboros) and Slugger's story, where the method came from.

Built with [Astro](https://astro.build) and [Tailwind CSS v4](https://tailwindcss.com), served by a Cloudflare Worker.

## Read the site

- [Homepage](https://ouroboros.bot/)
- [The approach](https://ouroboros.bot/approach/)
- [Hand this to your agent](https://ouroboros.bot/brief/) ([plain text](https://ouroboros.bot/brief.md))
- [Desk](https://ouroboros.bot/desk/) and [Ouro MD](https://ouroboros.bot/ouro-md/)
- [The story](https://ouroboros.bot/lab/story/) and [the Lab](https://ouroboros.bot/lab/)
- [Blog](https://ouroboros.bot/blog/)

## Development

```sh
npm install
npm run dev        # local dev server at localhost:4321
npm run build      # production build to ./dist/
npm test           # build, then run the tests in tests/ against dist/
npm run preview    # preview production build locally
```

## Structure

```
src/
  components/      # Nav, Footer, Lab heroes and docs shell
  data/            # OG manifest, readiness and Lab status, principles, model-review data
  layouts/         # Base HTML layout
  pages/           # Routes: approach, brief, desk, ouro-md, blog/, lab/, privacy, terms
  styles/          # Global CSS + Tailwind theme
  worker/          # Cloudflare Worker and the old-URL redirect map
public/
  brand/           # Logos and app icons
  brief.md         # The brief for agents
  llms.txt
tests/             # node:test suites
```

`AGENTS.md` has the rules for changing the site.
