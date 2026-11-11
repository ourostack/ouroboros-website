# Grow an agent: guide rewrite implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `/blog/build-ai-agent-from-scratch/` into a story-driven workshop guide that builds an agent loop on GitHub Copilot model access, works on macOS, PowerShell and WSL, and ships downloadable catch-up files.

**Architecture:** One Astro page rewritten in place, two new small Astro components (`ShellSwitch`, `SideQuest`) with no framework island, static catch-up files under `public/agent-loop/`, and the test fixtures that pin published sentences updated to match.

**Tech Stack:** Astro 5, Tailwind v4, vanilla `<script>` (Astro-bundled, deduplicated), Node 22.18+ `node --test`, `openai` npm package in the catch-up files.

**Spec:** `docs/superpowers/specs/2026-11-11-agent-loop-guide-design.md`

**Deadline:** merged and live by early afternoon PT, 2026-11-11. Workshop 2026-11-12 07:35 PT.

## Global Constraints

- Never name Ted Lasso or any show or character as a style reference.
- No agent SDKs (Copilot SDK, Agents SDK, etc). Model access is the plain `openai` package pointed at Copilot.
- Model access on the page is one friendly line; the details live inside the setup prompt the coding agent receives, plus one sentence that the endpoints are undocumented and use your Copilot quota.
- Model `claude-sonnet-5.5`; `gpt-4.1` named as the fallback. Node 22.18+, files run with `node mN.ts`.
- Env vars: `GITHUB_TOKEN` (from `gh auth token`) and `COPILOT_API` (from `gh api /copilot_internal/user --jq .endpoints.api`).
- Title stays "Just give the model a keyboard"; URL stays. "Grow an agent" is the workshop name (eyebrow line, catch-up files).
- Steinberger link: `https://youtube.com/watch?v=YFjfBk8HI5o&t=9298`, transcript `https://lexfridman.com/peter-steinberger-transcript#how-openclaw-works`, quote "it's like the Hello World in AI".
- Jenkins link: `https://www.youtube.com/watch?v=lghSjBl9yGM` is for us; the page doesn't cite it.
- Site copy rules (AGENTS.md): sentence-case headings; no italics outside `.prose-ouro em` and blockquotes; no React island for a static control; never hand-edit `src/components/ouro/`.
- No `<details>` / collapsible sections. Side quests are cards with anchor links there and back.
- localStorage key: `ouroboros-agent-loop-shell`; values `mac`, `powershell`, `wsl`. Default `mac`, or `powershell` when `navigator.userAgent` contains `Windows`.
- M4 safety: max 20 tool rounds per turn, 30 s shell timeout, output capped at 10 KB (10_000 chars), guarded `JSON.parse`, unknown tools return an error string, non-zero exit code reported to the model, shell is `powershell.exe` on win32 and `/bin/sh` elsewhere and its tool description names the shell.
- No town hall, calendar or other confidential content in this repo or its PR. No AI attribution in commits or PR.
- `npm test` and `npm run check:all` pass; Ouro check passes in CI.

## Review Focus

1. **JavaScript off:** every shell variant is visible and labeled, nothing hidden by default in server HTML. Pinned by `tests/agent-loop-guide.test.mjs` "all shell variants render without JS".
2. **Windows PowerShell 5.1:** no `&&`, `$env:` syntax, and the M4 shell tool actually runs under `powershell.exe`. Pinned by the devbox run in Task 1 and by the test "PowerShell variants never use &&".
3. **No token / wrong account:** learner sees a troubleshooting row that matches the real error (`OPENAI_API_KEY` mention, 401, 429). Pinned by the test "troubleshooting covers the real errors".
4. **Claude split replies:** a reply split across several `choices` loses tool calls if only `choices[0]` is read. Pinned by the M4 prompt text test and by the catch-up `m4.ts` merging all choices.
5. **Published-sentence fixtures:** a rewrite removes hundreds of pinned sentences; the build is red until the fixtures list them. Pinned by `npm test` in Task 4.

---

### Task 1: Catch-up files, verified on all three shells

**Files:**
- Create: `public/agent-loop/preflight.mjs`, `public/agent-loop/m1.ts` … `m4.ts`, `public/agent-loop/package.json` (copied from `/Users/arimendelow/.copilot/session-state/93a4d349-b026-446d-8eee-3e2f7c1e1b86/files/checkpoints/`)
- Test: `tests/agent-loop-files.test.mjs`

**Interfaces:**
- Produces: URLs `/agent-loop/preflight.mjs`, `/agent-loop/m1.ts` … `/agent-loop/m4.ts`, `/agent-loop/package.json` (Task 3 links them).

- [ ] **Step 1: Write the failing test** `tests/agent-loop-files.test.mjs`
  - "every catch-up file is served": `dist/agent-loop/{preflight.mjs,m1.ts,m2.ts,m3.ts,m4.ts,package.json}` exist.
  - "m4 carries the safety rules": `m4.ts` source matches `/20/` near the round limit, `30_?000`, `10_?000`, `powershell.exe`, `/bin/sh`, `JSON.parse` inside `try`, and reads every element of `choices` (not only `choices[0]`).
  - "no secrets": no file contains `ghp_`, `gho_`, `github_pat_` or `sk-`.
- [ ] **Step 2:** `npm run build && node --test tests/agent-loop-files.test.mjs` → FAIL (files missing).
- [ ] **Step 3:** Copy the files; `package.json` keeps `"type": "module"` and `openai@^7.50.0`, name `grow-an-agent`.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: macOS live run.** In a temp folder with `unset GH_TOKEN GITHUB_TOKEN` and the lowest-usage Copilot account (check the consumption page; ask the Babysitter session if unclear): `npm install`, `node preflight.mjs`, then pipe input through `m1`–`m4` (`m4` with `SHOW_MESSAGES=1`) and confirm M4 reads `secret.txt` and answers with the word.
- [ ] **Step 6: Windows devbox run.** Follow the Babysitter session's devbox steps. Repeat Step 5 in Windows PowerShell 5.1 and in WSL (WSL needs its own `gh` sign-in). Fix any bug in the files, re-run Steps 4–6. Record shell, Node version, account and pass/fail per file in the PR body.
- [ ] **Step 7: Commit** `feat: catch-up files for the agent loop guide`.

### Task 2: `ShellSwitch` and `SideQuest` components

**Files:**
- Create: `src/components/ShellSwitch.astro`, `src/components/SideQuest.astro`
- Test: `tests/agent-loop-guide.test.mjs` (shared with Task 3; this task adds the component tests)

**Interfaces:**
- Produces: `<ShellSwitch mac={string} powershell={string} wsl={string} label?={string} />`. When `wsl` is omitted it equals `mac`. Renders a `role="group"` segmented control styled like Ouro UI `SegmentedControl` (`~/code/ouro-ui/registry/ouro/components/ouro/segmented-control/segmented-control.tsx`), then three `<pre data-shell="mac|powershell|wsl">` blocks each preceded by a visible label ("macOS Terminal", "Windows PowerShell", "WSL"). The control buttons are `hidden` in server HTML and revealed by the script, so no-JS readers see only labeled blocks.
- Produces: `<SideQuest id={string} title={string} back={string}>` slot `</SideQuest>`, styled like `PromptCard.astro`, ending in a "Back to the main path" link to `#{back}`.
- Script: one Astro `<script>` in `ShellSwitch.astro` (bundled once per page). On load: read localStorage key, fall back to the default rule in Global Constraints, set `data-shell-active` on `<html>`, reveal the controls, hide non-matching `pre` and labels, mark the pressed button `aria-pressed="true"`. On click: save and apply to every switch on the page. CSS for hiding keys off `html[data-shell-active]`, so nothing is hidden without JS.

- [ ] **Step 1: Write failing tests** in `tests/agent-loop-guide.test.mjs`:
  - "all shell variants render without JS": the built guide has ≥1 `data-shell="mac"`, `"powershell"`, `"wsl"`; no `<pre data-shell` carries `hidden` or `style="display:none"`.
  - "PowerShell variants never use &&": text inside every `pre[data-shell="powershell"]` contains no `&&` and no `export `.
  - "side quests are cards, not collapsibles": the guide has no `<details`; every `SideQuest` id has a matching `href="#id"` elsewhere on the page and a back link.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement both components.
- [ ] **Step 4:** Run → PASS (once Task 3 uses them; until then, verify on a scratch use in the page).
- [ ] **Step 5: Commit** `feat: shell switcher and side quest cards`.

### Task 3: Page rewrite (story, prompts, side quests, ending)

**Files:**
- Modify: `src/pages/blog/build-ai-agent-from-scratch.astro` (all of it), `src/data/og.ts:174` (description), `src/pages/lab/story.astro:57` (four milestones, no streaming in the core path)

**Interfaces:**
- Consumes: `ShellSwitch`, `SideQuest` (Task 2); `/agent-loop/*` URLs (Task 1); `PromptCard` as today.

Follow the spec's story-shape table section by section. Fixed points:
- Hook sentence: "The loop fits on one screen, and it isn't the clever part." Then the Steinberger quote and link.
- "Why the long way": delegate outcomes, not steps; you could prompt "make me an agent loop"; today we walk it to build the mental model. Links `/approach/`, `/blog/trust-the-agent/`.
- Model access: one friendly line (spec "Model access"); details inside the setup prompt. The shell switcher appears only on commands the learner types: the preflight run, the `mkdir`/`npm` setup lines, running a milestone, and the token/endpoint exports.
- M3 ends on the raw tool call and "it asked, and nobody answered".
- M4 ends with `--show-messages` and "That's it. That's the agent."
- Each milestone: story paragraph, `PromptCard`, "Try it" line, catch-up link.
- Prompts tell the coding agent to merge text and `tool_calls` across all `choices`.
- Troubleshooting table rows: missing credentials (`OPENAI_API_KEY` in the error), 401, 400 model not supported, 400 not accessible through chat completions, 429 (switch account with `gh auth switch`), `gh: command not found`, PowerShell `&&` error.
- Keep growing: the existing growths trimmed, streaming among them; Growth 5 notes a skill is just markdown read with `read_file`.
- Sky's the limit: CART close; Ouroboros runs Butler and Shepherd; Desk is a sibling; links `/lab/story/`, `/apps/`, `/butler/`, `/desk/`.
- Side quests: bring your own key (MiniMax, Azure OpenAI, OpenAI), Responses API for newer GPT models, `<think>` tags.
- FAQ and FAQPage JSON-LD match the new content; `dateModified` "2026-11-11" in meta and JSON-LD.

- [ ] **Step 1: Add failing tests** to `tests/agent-loop-guide.test.mjs`:
  - "links Steinberger at the moment": href contains `YFjfBk8HI5o` and `t=9298`.
  - "no agent SDK and no style reference": page text has no `Ted Lasso`, `@github/copilot-sdk`, `@openai/agents`.
  - "troubleshooting covers the real errors": text includes `OPENAI_API_KEY`, `401`, `429`, `gh auth switch`.
  - "every milestone links its catch-up file": hrefs `/agent-loop/m1.ts` … `m4.ts` and `/agent-loop/preflight.mjs`.
  - "the ending names what the loop became": links `/lab/story/`, `/butler/`, `/apps/`, `/desk/`.
  - "prompts merge all choices": some PromptCard text mentions `choices` and `tool_calls`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Rewrite the page, og description and story line.
- [ ] **Step 4:** `npm run build && node --test tests/agent-loop-guide.test.mjs` → PASS. Read the built page start to finish once as a newcomer: does each section pull to the next?
- [ ] **Step 5: Commit** `feat: rewrite the agent loop guide as a workshop story`.

### Task 4: Fixtures, full suite, page checks

**Files:**
- Modify: `tests/fixtures/published-sentence-changes.json`, `tests/fixtures/approved-rewrites.json` (rows whose `surfaces` include `blog/build-ai-agent-from-scratch`), anything else `npm test` names.

- [ ] **Step 1:** `npm test` → expect FAIL in `sentence-retention` and `approved-rewrites`.
- [ ] **Step 2:** In `published-sentence-changes.json`, drop every entry for `blog/build-ai-agent-from-scratch`, `blog/build-ai-agent-from-scratch attributes`, `share card /blog/build-ai-agent-from-scratch` and `lab/story` lines this task changed, then add one entry per lost snapshot sentence with `now: null` (or the replacement if one sentence was reworded) and `why: "workshop rewrite (Ari, 2026-11-11)"`. Generate the list with a throwaway script from the test's own `lost` output; don't hand-type it.
- [ ] **Step 3:** In `approved-rewrites.json`, remove the three rows for this page (the page they governed is gone), keeping rows for other surfaces.
- [ ] **Step 4:** `npm test` → PASS. `npm run check:all` → PASS. Fix page findings in the page, not the checks.
- [ ] **Step 5: Commit** `test: update published-sentence fixtures for the guide rewrite`.

### Task 5: End-to-end follow-along, preview, ship

- [ ] **Step 1: Follow-along (macOS).** A fresh subagent with no context opens the built page (`npm run preview`), works in an empty temp folder, and follows only what the page says with a coding agent, through M4. Report every place it had to guess. Fix the page, re-run.
- [ ] **Step 2: Preview.** Open the preview in the browser canvas with JS on (switch to PowerShell, reload, choice persists; switching one snippet switches all) and JS off (all variants labeled). Phone width and desktop, light and dark.
- [ ] **Step 3: Ship.** `gh ouro-pr` (auto-merge on green). PR body: what changed, the Task 1 shell matrix, no AI attribution. Wait for `site-checks`; fix red.
- [ ] **Step 4: Live check.** Load https://ouroboros.bot/blog/build-ai-agent-from-scratch/ and `/agent-loop/m4.ts`; confirm the new content and that the switcher works.

### Task 6: CIT follow-through

**Files:** `/Users/arimendelow/CIT-workspace/_meta/guides/cit-learning-curriculum.md` rows 37, 48, 61 (in a CIT worktree, never switching branches in the main checkout).

- [ ] **Step 1:** Update the session date, Ready status and guide link.
- [ ] **Step 2:** Branch, PR, `cit-check` on the pushed head, merge on green.
- [ ] **Step 3:** `desk-task_update` on `cit-platform-landscape/cit-learning-curriculum` with the PR links.

## Parallelism

Tasks 1, 2 and 3 run at once (interfaces fixed above). Task 4 follows 2 and 3. Task 5 follows 1 and 4. Task 6 follows 5.
