# AGENTS.md

Instructions for any AI agent (Claude Code, Codex CLI, etc.) or human contributor working on this repo. Read this before editing.

This file is the contract. The design system header at the top of `src/styles/global.css` is the deeper source of truth for visual rules. The script comment block at the top of `scripts/model-reviews.cjs` is the deeper source of truth for the model-reviews data pipeline. When in doubt, read those.

## Pull requests merge fast

Follow ourostack's shared rule, [every PR merges fast](https://github.com/ourostack/.github/blob/main/agents/prs-merge-within-30-minutes.md). Finish, review and validate on your branch first, then publish with `gh ouro-pr`, which turns auto-merge on so green means merged. 30 minutes is the outer alarm, not the goal: merge and run CI as fast as possible. When a PR here shows on the [PR clock](https://github.com/ourostack/.github/issues?q=is%3Aissue+is%3Aopen+label%3Apr-clock), act on it now: merge it if green, fix the cause if red (file an issue before any rerun), rebase it if conflicted, or close it with a reason if it isn't going anywhere.

## What this site is

`ouroboros.bot` — Ari's method-first site: how to collaborate with agents (the approach, the brief for agents), the tools that support it (Desk, Ouro MD, the factory), the blog, and the Lab: the Ouroboros harness, Slugger's story, docs and model reviews. The harness and Slugger are where the method came from, so the Lab is a first-class section, not an archive. Astro 5 + Tailwind v4, served as static assets by a Cloudflare Worker (`src/worker/index.ts`).

- **Sibling repos:** `ourostack/ouroboros` (the harness), `ourostack/desk`, `ourostack/ouro-md`. Don't import from them; the site is independent.
- **Deploy:** only through `site-checks` on `main`, which calls `.github/workflows/deploy.yml` (build, `wrangler deploy`, live). On a push, its `proof` job (`scripts/tested-tree.mjs`) checks whether the merged pull request's own `site-checks` run already passed on this exact tree, workflows included; if so, production deploys at once, about a minute after the merge. Otherwise, or when that deploy fails, it deploys only after main's own checks pass. Main always runs every check either way. Every gap in the proof fails closed (`tests/tested-tree.test.mjs`), and a deploy whose commit is no longer main's head skips, so a late deploy never rolls production back. Every pull request gets a preview from `.github/workflows/preview.yml`. `.github/workflows/deploy-ouro-ui-host.yml` also deploys ui.ouroboros.bot's host Worker (`ouro-ui-host`, ourostack/ouro-ui `site/host/`) with this repository's Cloudflare token, because ouro-ui has none: every 15 minutes it deploys when ouro-ui's newest `site/host/` commit differs from the live one, checks http → https and HSTS, and rolls back on failure. `.github/workflows/deploy-ouro-apex.yml` does the same for ouro.bot's redirect Worker (`ouro-apex`, ourostack/ouro-apps-site), whose own token can't deploy Workers: three times an hour, following that repository's README steps and its stable.json refresh window, with `versions upload` and `versions deploy` so the ouro.bot routes are left alone. While either Worker's live deployment is a rollback (by the job after a failed check, or by a person), its scheduled runs hold; run the workflow by hand to resume.
- **Tests:** `npm test` builds, then runs `node --test 'tests/*.test.*'` against `dist/`. Set `SITE_DENYLIST_FILE` (a file outside this repository, one string per line) to also check that no built page contains private names. `git config core.hooksPath .githooks` turns on a pre-push hook that runs `npm test` and, when installed, `actionlint` (about 30 s), so most failures show before a push instead of about 3 minutes into `site-checks`. It replaces no gate; `git push --no-verify` skips it.
- **Page checks:** `npm run check:all` serves `dist/` on 127.0.0.1 the way the Worker does (`scripts/serve-dist.mjs`: its redirects and its 404 page) and runs every `check:*` against it, or against `SITE_BASE` when set. A new `check:*` script must be added to `CHECKS` and its measured seconds to `SECONDS` in `scripts/check-shards.mjs`, or `check:all` and `tests/check-shards.test.mjs` fail. `.github/workflows/site-checks.yml` runs on every PR and push to main in parallel jobs: `npm test` and the brand audit (`ourostack/.github` `brand/tools/audit.mjs --origin`) in one, and `check:all` in four shards split by those recorded seconds (`npm run check:all -- --shard k/4`). Each uploads its logs as a `site-checks-logs-*` artifact. On a PR a failed shard cancels its siblings; main always runs whole.
- **Ouro check:** the same workflow runs Ouro check (`lib/ouro/check/check.ts`, installed from the Ouro UI release tag named by `OURO_UI_TAG` in the workflow, and diffed against that tag before each run) over the build at 390x844, 1440x900 and 3840x2160, light and dark, in six shards. It covers overlap, blur, fades, type scale, heading order, corners, repaints and more. Each shard uploads `report.json`, `summary.md` and a cropped close-up per finding. Fix a finding in the page. Where a finding is on purpose, mark the element `data-ouro-allow="<rule>"` with `data-ouro-allow-why="<reason>"`; page-wide waivers go in `ouro-check.json`, one page each with the measurement that justifies it. A last job named `site-checks`, the one required check on main, passes only when the tests and every page and Ouro check shard pass. `first-content` (time to the largest content) is gated at 6000 ms, not Ouro's 2500 ms, because CI's runners vary by up to about 4.6 s on unchanged pages; `ouro-check.json` records the runs. Taste reviews stay by hand.
- **Product pages:** each page in `PRODUCT_PAGES` (`scripts/primary-action.mjs`) marks its hero lede `data-hero-lede` and its one primary action `data-primary-action`. `check:cta` holds the action fully in the first view with 24px to spare at 1024x768, 1280x800, 1440x900 and 1920x1080, and directly under the lede on phones. Make room by tightening the hero, never by shrinking the art below its floor. A new product page goes in `PRODUCT_PAGES`.

---

## Hard rules — read these first

### 1. NO ITALIC ANYWHERE

Italic Cormorant Garamond is hard to read at every size below true display scale and looks bad. The only allowed italic on the site is:

- `.prose-ouro em` — HTML semantic `<em>` emphasis (1–3 words inside long-form prose)
- `.prose-ouro blockquote` — intentional editorial styling

Cormorant ships in this site as **Regular (400) only**. Even hero H1s use Cormorant non-italic. Use the `.heading-lead`, `.heading-hero`, `.heading-section`, `.heading-sub` utility classes from `global.css` — don't inline new heading sizes.

### 2. SENTENCE CASE FOR ALL TITLES AND HEADLINES

Page `<title>` tags, H1s, H2s, H3s, blog post titles, doc titles, nav links, footer links — **all sentence case**. Never Title Case.

- Capitalize only the first word and proper nouns (Ouroboros, Anthropic, OpenAI, AI, AX, TypeScript, Google, etc.)
- After em-dash `—` or pipe `|` separators, lowercase the next word unless it's a proper noun
- Example: `"All four models tested chose Ouroboros — Ouroboros"` ✓, not `"All Four Models Tested Chose Ouroboros"` ✗

Eyebrow labels styled ALL CAPS via CSS (`uppercase` + `tracking`) are fine — the source text is still sentence case, the transformation is presentational.

### 3. CORMORANT IS THE DISPLAY FONT EVERYWHERE

Headers, nav, hero claims — all use Cormorant via the `.heading-*` utility classes in `global.css`. The site should feel like one designer designed it. If you find yourself writing a one-off heading style, that's a sign the utility classes need a new variant — add it to `global.css`, then use it.

### 4. VERBATIM MODEL QUOTES — NEVER CURATE

The model-reviews script output (`src/data/model-reviews.json` + `src/data/model-reviews-transcripts/*.json`) is the **sole source of truth** for any model voice that appears anywhere on the site. Site templates pull from this raw output directly.

**The rules:**

- **Never hand-edit a quote** in the JSON. Verbatim from the model or it doesn't ship.
- **Never hand-pick which sentence** of a longer testimonial to highlight on a card. That's curation, even if the words are verbatim.
- **Never paraphrase** a model's quote and present it as a quote.
- **Never copy** winning language from a previous run back into the prompt as an "example" — that's priming.
- **Never list dimensions** to evaluate on (e.g. "consider identity, memory, relationships") — that primes the answer.
- **Never give the model descriptions** of the things it's evaluating. The script gives only name + repo URL; the model has to research from scratch.

**When the output is malformed:** adjust format constraints without steering content. Repair source-access failures symmetrically for all candidates. An undesired verdict is not malformed output; never rewrite it or repeat unchanged inputs just to seek a different vote.

**Format constraints are OK** in the prompt (e.g. "use this markdown shape", "do not begin with X") because they're about shape, not content.

The whole pitch of `/model-reviews` is independence and verifiability — curating quotes destroys that pitch.

### 5. MARKETING CLAIMS DERIVE FROM THE DATA

Every claim about model-review results must come from `getModelReviewClaims()` in `src/lib/model-review-claims.mjs`, which derives the winner, numerator, and tested denominator from `modelReviews.summary`. Never imply that a selected panel represents every frontier model. If a future re-run produces different verdict counts, every page and OG card must update automatically.

The shared helper is used by `lab/model-reviews.astro`, `lab/why.astro`, `lab/what-is-agent-experience.astro`, and `og.ts` (which also derives the Lab card's review summary). The homepage makes no model-review claim.

**Readiness labels** come only from `src/data/readiness.mjs` (`labelFor()`), using its approved vocabulary (Ouro HX is “Use today”; the factory keeps “Under construction”). Never call a product stable, supported or production-ready. **Lab status** (Origin, Experiment) comes only from `src/data/lab.mjs`; `Layout.astro` shows it, with a link back to `/lab/`, on every `/lab/*` page.

The brand name in nav links, page titles, and section eyebrows is fine — those are brand identifiers, not claims about the data.

### 6. OG CARDS — SINGLE SOURCE OF TRUTH, DYNAMIC AT BUILD TIME

OG cards are generated dynamically at build time from a single manifest. There is **no manual regeneration step**.

- `src/data/og.ts` exports `pageOg` mapping page route → `{ title, subtitle, tag }` plus `ogPathFor()` and `slugFor()` helpers.
- `src/pages/og/[...slug].jpg.ts` reads the manifest and renders one JPEG per entry at build time: Satori draws the title, sharp lays it over the page's storybook scene (`og` in `src/data/scenes.mjs`, served byte for byte from `/brand/storybook/og/`).
- Every page imports `ogPathFor` and passes the result to `<Layout ogImage={ogPathFor('/route')}>`. Never hardcode an OG path string.
- On every push, the deploy runs `astro build` → every card regenerates from the manifest → live.

**Adding a new page:**

1. Add an entry to `pageOg` in `src/data/og.ts`
2. In the page frontmatter: `import { ogPathFor } from '../data/og'`
3. Pass `ogImage={ogPathFor('/your-route')}` to `<Layout>`
4. Done. Next deploy generates the OG.

**Anti-patterns to never reintroduce:**

- A separate `scripts/generate-og.ts` writing static PNGs by hand
- Static PNG files committed in `public/og/`
- Hardcoded `ogImage="/og/og-X.png"` strings in pages
- Two `pages` arrays defining the same metadata in different files

**The tag (eyebrow) must make sense in isolation** — someone seeing the OG card on Twitter/Slack with no page context. Don't reuse a section eyebrow from inside the page if it'd be confusing without that context. When in doubt, omit the tag.

### 7. POSITIONING IS ARCHITECTURAL, NOT GENERIC

> Open question for Ari: this rule predates the method-first site and applies to harness copy in the Lab. It has not been rewritten.

Differentiator copy must reference real Ouroboros architecture (5-file structured psyche, automatic associative recall, friend records with trust gating, inner dialog, creature-body layout, diary/journal split, etc). "The agent that remembers" is meaningless — every agent has memory. See the `project_competitive_positioning.md` memory file (Ouroboros vs OpenClaw, verified against source).

### 8. DECK-SLIDE DENSITY

Each section should land in ~2 seconds at a glance. One main idea per section. Minimal text supporting one clear hierarchy. Generous but bounded whitespace — don't billboard 4 words across a 1000px canvas, and don't smush text into the corner of a `max-w` container. If a section needs a paragraph of explanation to make sense, the headline isn't doing its job.

### 9. MOBILE-FIRST

Every layout must work on a 700px-tall mobile viewport before it works on desktop. Test on mobile sizes first. Never use single-column flowing text — always use grids/cards/multi-column layouts.

### 10. LINKS LOOK LIKE LINKS

Color, underline, arrow, or button — links must be visibly clickable. Hover-only affordance is not enough.

### 11. NO DUPLICATE TEXT

Don't show the same information twice in different formats (e.g. `"Claude Opus 4.6"` and `"claude-opus-4-6"` next to each other). Pick one.

### 12. EVERGREEN CONTENT, STRUCTURED METADATA

Pages that should stay evergreen (e.g. `/model-reviews`) do not show visible publish/run dates in the UI. Dates go in JSON-LD structured data via `<Fragment slot="head">` for SEO and machine consumers. Click-through to specific runs surfaces dates where relevant.

---

## Writing voice

Ari's writing style guide lives at `~/clawd/skills/writing-style/SKILL.md`. Always consult it when writing or editing copy. The short version:

- Understated > overstated. Let the reader conclude.
- No redundancy — if a point is made, move on.
- No LinkedIn-speak ("Written by X, improved by X, loved by X").
- No announcing transitions — just make them.
- Short sentences for impact, long for flow.
- Banned phrases: "Let me explain", "Here's the beautiful part", "case in point".
- Every ending: understated, not cringy.
- "Would this embarrass me on a billboard?"

---

## Repo layout

```
src/
  components/
    HeroCover.astro      ← shared title-card hero used by the Lab pages
    Nav.astro            ← the site's own sections, under the family bar (rendered into Layout)
    Footer.astro         ← the line, then Ouro HX FamilyFooter with Privacy, Terms, LinkedIn, copyright
    ouro/                ← Ouro HX components installed with shadcn from an ouro-ui release tag (never hand-edit; reinstall)
    DocsPageShell.astro  ← wrapper for /lab/docs/* sub-pages
    OuroborosRing.astro  ← decorative SVG ring
    SerpentGuidePreview.astro
    PromptCard.astro
  data/
    og.ts                ← OG metadata manifest (single source of truth)
    scenes.mjs           ← which storybook scene each page opens on and shares with
    site.mjs             ← nav links, footer extras, family links and which one is current
    llms.txt             ← /llms.txt's text; src/pages/llms.txt.ts fills in its family section from family.json
    family.json          ← the family list, a byte copy of ourostack/.github brand/family.json (tests/family.test.mjs)
    principles.mjs       ← the five principles, the smells, shared setup and install lines
    readiness.mjs        ← the only source of readiness labels
    lab.mjs              ← the only source of Lab status labels
    model-reviews.json   ← script output (DO NOT hand-edit)
    model-reviews-transcripts/*.json ← per-provider transcripts (DO NOT hand-edit)
  layouts/
    Layout.astro         ← root <html><head><body>, family bar, nav, footer, Lab status bar, copy-button script
  lib/
    model-review-claims.mjs ← getModelReviewClaims()
    ouro/                ← helpers the Ouro HX components import (installed with them)
  pages/
    index.astro          ← /
    approach.astro       ← /approach
    brief.astro          ← /brief (shows public/brief.md)
    desk.astro, ouro-md.astro ← /desk, /ouro-md
    ouro-md/download.astro ← /ouro-md/download, Ouro MD's download page (moved here from ouro.bot)
    apps.astro           ← /apps (the shelf), moved here from ouro.bot
    blog/                ← /blog index and every post, at the URLs they were published under
    lab/                 ← /lab: why, story, what-is-an-agent-harness, model-reviews (+ [provider]), docs/* (use DocsPageShell); index.astro carries the old harness homepage
    privacy.astro, terms.astro
    og/[...slug].jpg.ts  ← dynamic OG image endpoint (build-time pre-render)
    404.astro
  styles/
    global.css           ← @theme tokens, light theme, @apply utility classes, design rules header
  worker/
    index.ts             ← Cloudflare Worker: redirects, then static assets with cache headers
    redirects.mjs        ← the old-URL map (/docs, /why, /story, ... → /lab; preview-only /essays → /blog)
    https.mjs            ← the ouroboros-website-https Worker (wrangler-https.jsonc): plain HTTP and www → https://ouroboros.bot
  og/
    fonts/               ← TTFs for Satori OG generation
lib/
  ouro/check/            ← Ouro check, installed from an ouro-ui release tag (ouro-check item); fades.ts is the fade scan
scripts/
  model-reviews.cjs      ← private review runs and separate guarded promotion into src/data/
tests/                   ← node:test suites that read dist/
public/
  brief.md               ← plain-text surface for agents (llms.txt is built: src/pages/llms.txt.ts from src/data/llms.txt)
  brand/                 ← logos and app icons (copied, never redrawn)
  fonts/                 ← woff2 fonts loaded by global.css
  images/
  og/                    ← EMPTY — OG cards are generated dynamically, never committed
  skills/                ← skills/manifest.json + skill markdown for agent consumption
```

## The storybook world

Since 2026-11-06 every page opens on a scene from Ari's storybook brand (ourostack/.github `brand/`): `src/data/scenes.mjs` maps each route to its hero scene and card scene, `Layout.astro` draws the hero and the footer meadow, and `src/components/StoryScene.astro` is the one `<picture>`. The art is copied **byte for byte** into `public/brand/storybook/` by `node scripts/sync-storybook.mjs <brand folder>`; never re-encode, optimize or crop it in a build step, because the brand audit compares the served bytes with `provenance.json` (`tests/storybook.test.mjs` checks too). A new page gets a route in `scenes.mjs`; a new scene means re-running the sync.

**No picture ever fades** (Ari: no fades on images). Every hero ends at a hard edge at its art's foot, with the gold trail closing the edge; the meadow above the footer has hard edges; OG cards put their words on a solid plate or on the art itself, never under a scrim that fades. A gradient that fades no picture (a tint, a drawn grid, a timeline line) is fine, and a gradient mask on one needs `fade-ok: <reason>` on its own line or in a comment line just before it. `tests/no-image-fades.test.mjs` runs Ouro check's fade scan (`lib/ouro/check/fades.ts`) over `src/` and `public/` in `npm test` and fails on any gradient mask without one; `node lib/ouro/check/fades.ts src public` runs the same scan by hand.

## The family bar

Every page opens with Ouro HX's `FamilyBar` above the nav and closes with its `FamilyFooter`, both installed from an ouro-ui release tag into `src/components/ouro/` and rendered on the server with no client directive, so they ship no script. The links come from `src/data/family.json`, a byte copy of ourostack/.github `brand/family.json`; change the family there, then copy it here. `familyCurrent()` in `src/data/site.mjs` marks Ouro MD under `/ouro-md/`, Desk under `/desk/`, Apps under `/apps/` and Ouro everywhere else. The site's own nav carries only this site's sections and never repeats a family link. Ouro's theme tokens are mapped onto the site's palette in `global.css` for both themes; to update them, reinstall from the new tag with `npx shadcn@latest add ourostack/ouro-ui/family-footer#<tag> ourostack/ouro-ui/ouro-check#<tag> --overwrite` (family-footer brings family-bar). Below 40rem the bar is hidden (a wrapper with `max-sm:hidden`, no script) and the phone menu lists the seven sites under an "Ouro family" heading, this one marked; the footer carries them on every page. The three navs are named the same on every family site: the bar "Sites", the site's own nav "Primary", the footer "All sites". Every page opens on Ouro HX's `SkipLink` to `<main id="main">`. llms.txt lists the family from family.json by the bar's names.

## Ouro HX's page moved to ui.ouroboros.bot

On 2026-11-07 Ouro HX's page (`/ouro-hx/`) moved to [ui.ouroboros.bot](https://ui.ouroboros.bot/), the Ouro UI site in ourostack/ouro-ui (`site/`), which is the one home for Ouro UI, HX and AX (Ari: "let's unify? i trust you"). `src/worker/redirects.mjs` sends `/ouro-hx`, `/ouro-hx/` and `/ouro-hx/index.html` there with a 301 that keeps the query. **Rule for new work:** pages and copy about HX, UI or AX are written in ourostack/ouro-ui `site/`; this site only links to them.

## HTTPS only

Every plain-HTTP request to ouroboros.bot and every request to www.ouroboros.bot gets a 301 to the same path and query on https://ouroboros.bot, and every response carries `Strict-Transport-Security: max-age=31536000` (Ari, 2026-11-09: "why doesn't http forward to https on all these sites?"). A second Worker, `ouroboros-website-https` (`src/worker/https.mjs`, `wrangler-https.jsonc`, deployed by `deploy.yml` after the site), owns only the routes `http://ouroboros.bot/*` and `www.ouroboros.bot/*`, so HTTPS visits keep coming straight from static assets without a Worker call. `public/_headers` adds HSTS to every static asset, and the site's Worker adds it to the responses it builds, because Cloudflare applies `_headers` only to what the asset layer serves directly. `tests/https.test.mjs` holds all of this.

## ouro.bot forwards here

ouro.bot's website moved onto this site on 2026-11-06 (Ari: "we need a unified domain"), and Ouro MD's download page followed on 2026-11-07 (Ari: "move every surface to ouroboros.bot and have ouro.bot forward"). The `ouro-apex` Worker in ourostack/ouro-apps-site forwards each old ouro.bot path to its home here with a 301 (`/` and `/apps/` to `/apps/`, `/apps/ouro-hx/` straight to https://ui.ouroboros.bot/, `/apps/ouro-md/` to `/ouro-md/download/`, `/apps/ouro-md/stable.json` to `/ouro-md/stable.json`, `/ouro-md-install.sh` to the same path here, each old `/assets/` file to its copy here, anything else to the same path here). ouro.bot serves no files of its own any more.

Ouro MD's download page lives here now, so every change to it (and every taste round on it) is made in this repository:

- The page is `src/pages/ouro-md/download.astro`; `/ouro-md/` stays the product page.
- `public/ouro-md/stable.json` is the release metadata the page reads. `.github/workflows/refresh-ouromd-release.yml` rewrites it hourly from Ouro MD's latest GitHub release (`scripts/refresh-ouromd-release.mjs`). When it changed, the workflow opens a pull request, dispatches `site-checks` on it (a pull request opened with the workflow's own token starts no run), merges it when that passes, then dispatches `site-checks` on main, which deploys when it passes, because a merge made with that token starts no push run. main requires `site-checks`, so the workflow never pushes there directly.
- `public/ouro-md-install.sh` is the one-line installer, a copy of ourostack/ouro-md `web/ouro-md-install.sh`; keep the two byte for byte the same.

`tests/ouro-bot-forwards.test.mjs` fails if a forward target disappears; when you move one of those pages or files, update that Worker's map too.

## Conventions

- **Astro file frontmatter:** import Layout (or HeroCover for top-level pages), import `ogPathFor` from `../data/og`, define const `title`/`description`, pass `ogImage={ogPathFor('/route')}` to Layout.
- **Heading sizes:** use `.heading-lead` (page H1s), `.heading-hero`, `.heading-section`, `.heading-sub` from `global.css`. Don't inline.
- **Moving a page:** add the old path to `src/worker/redirects.mjs` and a case to the redirect test, and add a glob for it to `assets.run_worker_first` in `wrangler-worker.jsonc` with a case in `tests/worker-first.test.mjs`. Without the glob, Cloudflare answers a browser's navigation with the 404 page before the Worker runs, while `curl` still sees the 301.
- **Eyebrows:** use `.eyebrow` (mono uppercase fang-red tracking) or `.caption-mono` (mono uppercase shadow tracking).
- **Colors:** the dark organic palette is defined in `@theme` in `global.css`. Use the named colors (`text-bone`, `bg-deep`, `text-scale`, `text-fang`, etc.), not raw hex.
- **Animations:** `.animate-fade-up` with `.stagger-1` through `.stagger-5` for staggered reveals. `.reveal` for scroll-triggered.

## Git & commits

- **Never** add `Co-Authored-By: Claude` or any AI attribution to commits or PRs.
- **Never** add "Generated with Claude Code" or similar AI watermarks.
- **Never** skip git hooks (`--no-verify`).
- Conventional commit prefixes: `feat`, `fix`, `style`, `refactor`, `chore`, `data`, `copy`, `docs`.
- Concise one-line summary, then a body explaining **why** more than **what**.
- Email: `16390116+arimendelow@users.noreply.github.com` (set `user.email` in each clone).

## Adding a new page — checklist

1. Create the `.astro` file in `src/pages/`
2. `import Layout` and `import { ogPathFor } from '../data/og'`
3. Add an entry to `pageOg` in `src/data/og.ts` with the route as the key
4. Pass `ogImage={ogPathFor('/your-route')}` to Layout
5. Use sentence case for the page title
6. Use `.heading-lead` for the H1 (Lab pages may wrap with `<HeroCover>`)
7. If it names a product's readiness, use `labelFor()` from `src/data/readiness.mjs`; if it's a Lab piece, add it to `src/data/lab.mjs`
8. Update the nav and footer links in `src/data/site.mjs` if it's a top-level page
9. Run `npm test` to verify it builds, the OG image generates and the tests pass
10. Commit, push to a branch, open a pull request and check its preview

## Re-running the model-reviews script

```bash
npm run reviews -- --preflight
npm run reviews -- --output-dir /private/new-run
npm run reviews -- --inference copilot-first --output-dir /private/copilot-run
npm run reviews:headless -- --output-dir /private/another-new-run
npm run reviews -- --publish /private/completed-run/run.json
```

Requires Perplexity for search and credentials for the chosen inference path. Direct API mode is the default (`--inference direct-api`): set the selected vendors' API keys, with no Copilot account or subscription required. `--inference copilot-first` is optional and requires Copilot authentication. That mode uses Copilot inference for exact catalog matches and direct API keys only for catalog gaps, never after Copilot auth, quota, or execution failures.

Both inference paths use the bundled Copilot SDK runtime in stripped `empty` mode with compaction and large-output indirection disabled. API-only users do not need a separate interactive Copilot installation or login. Direct mode disables logged-in GitHub identity and token use and skips Copilot auth/catalog calls. Keep runtime identity separate from inference mode and transport in saved evidence. The TODO at `resolveTransports` marks the extension point for other multi-model providers.

Ordinary runs never modify `src/data`. Choose a fresh output directory outside this repository; without `--output-dir`, the runner creates a private run directory under `~/.local/state/ouroboros-model-reviews/`. Preflight resolves auth, routing, and public source snapshots without an inference turn. Completed and failed runs are preserved privately. The run's `raw/` directory contains uncommitted research captures and runtime logs; never publish or commit it.

Public promotion is separate. Keep the completed run's local `raw/evidence.json` beside `run.json`; promotion requires the full original evidence even though that evidence must never be committed or published. `--publish` validates the originating run IDs, model identities, candidate revisions, prompt hashes, research coverage, timestamps, and transcript/summary agreement, then reconstructs the publication from the original results to compare every quote, prefix, length, and hash. The site's release hold requires every selected reviewer to choose Ouroboros in that one complete run. Valid dissent remains a valid private result, not an incomplete run. Never assemble favorable votes across attempts, rewrite model text, or rerun unchanged inputs solely to seek a preferred outcome.

Promotion stages all files and recoverable originals before replacing `src/data/model-reviews.json` and its transcripts. A replacement failure restores the originals; an incomplete restoration fails loudly and retains its recovery files. Commit only an accepted promoted dataset. **Never hand-edit model quotations.** Source commits, run-specific candidate counts, and methodology must describe that exact run. When publishing results from an iterative product-development cycle, disclose that context rather than presenting them as a one-shot independent benchmark.

## Where to look for deeper context

- `src/styles/global.css` header — design system rules (the canonical version of the hard rules above)
- `scripts/model-reviews.cjs` header — model-reviews data pipeline rules
- `src/data/og.ts` header — OG card rules
- `~/.claude/projects/-Users-arimendelow-Projects-ouroboros-website/memory/` — Ari's private project memory (feedback files, competitive positioning, writing style)
- `src/components/HeroCover.astro` — the standard top-level page hero, used everywhere
