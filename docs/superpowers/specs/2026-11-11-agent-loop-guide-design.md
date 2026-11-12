# Grow an agent: guide rewrite design

Date: 2026-11-11
Page: `src/pages/blog/build-ai-agent-from-scratch.astro` (ouroboros.bot/blog/build-ai-agent-from-scratch/)
First use: a live workshop on 2026-11-12. The host sends the guide, walks it and follows it on screen. The page must also stand alone for any public reader.

## Outcome

A reader finishes with an agent loop they built and understand, is excited to keep going, and leaves knowing the loop is a starting point, not a toy. Done looks like:

1. The guide tells a story that pulls people forward, using the seven moves from Shannon Jenkins's talk [How to tell stories better than 99% of people](https://www.youtube.com/watch?v=lghSjBl9yGM). It never names a show or character as a style reference.
2. It links Peter Steinberger's "build an agent loop" moment on Lex Fridman #491 (02:34:58, `https://youtube.com/watch?v=YFjfBk8HI5o&t=9298`; transcript `https://lexfridman.com/peter-steinberger-transcript#how-openclaw-works`).
3. The main path gets model access from GitHub Copilot through `gh auth token` and the plain `openai` package. No agent SDKs, no new API keys.
4. It says, briefly, that real work with agents delegates outcomes, not steps; one prompt could build this loop. We walk the steps on purpose to build the mental model.
5. It works in macOS Terminal, Windows PowerShell and WSL.
6. It ends with concrete next steps and the sense that the sky is the limit.

## Story shape

| Beat | Section | Story move |
|---|---|---|
| Hook | "The loop fits on one screen, and it isn't the clever part." Steinberger quote ("it's like the Hello World in AI") and link. | Curiosity: a claim the page pays off |
| Why the long way | Two or three sentences: we delegate outcomes, not steps; you could prompt "make me an agent loop". Today we take the long way so the loop becomes yours. Links to [approach](/approach/) and [trust the agent](/blog/trust-the-agent/). | Personal, not private |
| Preflight | Node 22.18+, `gh` signed in, Copilot on, a coding agent (any: Copilot CLI, Claude Code, Codex). `preflight.mjs` proves one real request works. Troubleshooting table follows. | Ground rules |
| Set up | Fresh folder, `secret.txt` with a word of your choosing. | Plant the thread |
| M1 First contact | One request, one answer. Ask for the secret word; it can't know. | Tension |
| M2 Conversation | REPL that keeps `messages`. Quick. | Change of pace |
| M3 One tool | Add `read_file`. Print the raw tool call and stop: it asked, and nobody answered. | Zoom in, keep them waiting |
| M4 The loop | Add `write_file` and `shell`; feed results back until the model is done. It reads `secret.txt` and answers. `--show-messages` prints `messages`. "That's it. That's the agent." | Payoff and the unexpected |
| Handoff | Your agent works on its own code. Name it. Then the honest gap list: memory, safety, compaction, recovery. | Delight, honesty |
| Keep growing | The existing six growths, trimmed, streaming among them. Growth 5 notes that a skill is just markdown it reads with `read_file`. | Reinterpretation |
| Sky's the limit | CART close (context, action, result, takeaway). This loop is how Ouroboros started: a 150-line bootstrap became the Ouroboros harness, which runs Butler and Shepherd every day and is still where harness ideas get tested. Desk came out of the same exploration but works with any harness, so the page names it as a sibling tool, not something Ouroboros runs. Links to [the story](/lab/story/), [apps](/apps/), [Butler](/butler/), [Desk](/desk/). Yours can become anything. | Land the takeaway |
| Side quests | Bring your own key (MiniMax, Azure OpenAI, OpenAI); newer GPT models through the Responses API; reasoning models and `<think>` tags. | Optional depth |

The metaphor carried through: the model is the reasoner, the tools are its keyboard, and the loop hands every result back until it's done.

Each milestone keeps today's pattern: a short story paragraph, a prompt card the reader pastes into their coding agent, a "try it" line, and a link to the catch-up file. The code shown on the page stays short; the coding agent writes the real files.

## Model access

The page doesn't teach this part; it isn't the point. The reader sees one friendly line, roughly: "For the model, borrow the GitHub Copilot access you already have. Your coding agent sets it up." Everything below lives inside the setup prompt the coding agent receives, plus one short note that the endpoints are undocumented and use your Copilot quota. The shell switcher only appears on the few commands a learner types themselves (preflight check, running a milestone).

All shells, one line at a time (PowerShell 5 has no `&&`):

```
mkdir agent
cd agent
npm init -y
npm pkg set type=module
npm install openai
```

| | macOS and WSL | Windows PowerShell |
|---|---|---|
| Token | `export GITHUB_TOKEN=$(gh auth token)` | `$env:GITHUB_TOKEN = gh auth token` |
| Endpoint | `export COPILOT_API=$(gh api /copilot_internal/user --jq .endpoints.api)` | `$env:COPILOT_API = gh api /copilot_internal/user --jq .endpoints.api` |

Client: `new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: process.env.COPILOT_API })`; model `claude-sonnet-5.5` (`gpt-4.1` also works). Run with `node m1.ts` (Node 22.18+ strips types). The page says in one sentence that these endpoints are undocumented and use your Copilot quota. WSL needs its own `gh` install and sign-in.

Prompts tell the coding agent to merge text and `tool_calls` across all `choices`, because Claude can split one reply.

## Safety in the loop

The M4 prompt asks for: at most 20 tool rounds per turn; a 30-second shell timeout; output capped at 10 KB; guarded `JSON.parse`; unknown tools returned as error strings; a non-zero exit code reported to the model. The shell tool runs `powershell.exe` on Windows and `/bin/sh` elsewhere, and its description names the shell. Learners work in a fresh folder with nothing secret in it.

## Shell switcher

A segmented control (macOS, PowerShell, WSL) on each shell snippet. Every snippet renders all variants in the server HTML; without JavaScript, all variants show, each labeled. A small inline script hides the unselected variants and stores the choice under `ouroboros-agent-loop-shell` in `localStorage`, so choosing on one snippet switches every snippet on the page. The default before any choice is macOS, or PowerShell when the user agent reports Windows.

It's a plain Astro component with a vanilla script and radio-group semantics, modeled on Ouro UI's `SegmentedControl` and `Tabs`. No React island, and nothing under `src/components/ouro/` is hand-edited. It must pass Ouro check at the required viewports and themes.

## Side quests without collapsible sections

A small signpost card in the flow ("Side quest: bring your own key") links to the Side quests section near the end. Each side quest is a plain styled Astro card, modeled on `PromptCard.astro`, with a link back. No `<details>`.

## Catch-up files

`public/agent-loop/` serves `preflight.mjs`, `m1.ts`, `m2.ts`, `m3.ts`, `m4.ts` and a minimal `package.json`. Each milestone links its file so anyone who falls behind can catch up. Each is verified against Copilot on macOS, Windows PowerShell and WSL.

## Troubleshooting table

Missing credentials (the `openai` error mentions `OPENAI_API_KEY`), 401, 400 model not supported, 400 not accessible through chat completions, 429 quota exceeded (switch account with `gh auth switch`), `gh: command not found`, PowerShell `&&` error.

## Other changes

- Rewrite the setup and M1 prompts for `GITHUB_TOKEN` and `COPILOT_API`; drop the AzureOpenAI default and the fixed agent name.
- FAQ and FAQPage JSON-LD, `dateModified` in the meta tag and JSON-LD, the OG description in `src/data/og.ts`.
- Site rules: sentence-case headings, no italics outside prose and blockquotes, `npm test` and `npm run check:all` pass.

## Calls made after the builder check

- **Desk wording.** Desk is described as a sibling tool that grew from the same work, because its page says it works with any harness.
- **Title.** The page keeps its title, "Just give the model a keyboard", and its URL, because an earlier taste review settled on one title everywhere. "Grow an agent" is the workshop's name, used in the eyebrow line and in the catch-up files.
- **Lab story page.** Its "Five milestones… streaming…" line is updated to match four milestones.
- **Windows.** A verifier runs `preflight.mjs` and `m1`–`m4.ts` on a Windows devbox, in PowerShell and in WSL, using the GitHub Copilot account with the lowest usage. The page claims Windows support only once that passes.

## Out of scope

Progress rail, companion repo, interactive `messages` trace, streaming in the core path (it stays as a growth), agent SDKs.

## Verification

1. A fresh subagent follows the published prompts from an empty folder with a coding agent on macOS and reaches a working M4.
2. Each catch-up file runs against Copilot.
3. `npm test`, `npm run check:all`, preview check with JavaScript on and off, then publish with `gh ouro-pr` and check the live page.

## Run of show (40 minutes, 15 of slack)

| Minutes | Beat |
|---|---|
| 0–5 | Hook, Steinberger, why the long way, preflight check |
| 5–12 | Set up, M1 |
| 12–17 | M2 |
| 17–25 | M3 |
| 25–35 | M4, print `messages` |
| 35–40 | Handoff, name it, sky's the limit |

Slack covers catch-up, one live growth and show and tell.
