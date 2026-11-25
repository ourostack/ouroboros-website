# AGENTS.md

This folder holds agent.ts, a tiny agent built from scratch so a person can learn how agents work. They will read every line, so write it for them.

- Keep agent.ts short and plain, like a script: the fewest lines that do the job. No clever tricks, no extra layers, no checks for things that won't happen.
- Put the loop first, near the top, so a reader meets it before the plumbing it uses, and keep it as plain as the conversation it runs.
- Skip TypeScript types unless Node needs them; `any` is fine.
- When the same shape would appear three times, write one small helper instead.
- Add a short comment wherever something important happens, saying what it does and why.
- Build only what was asked for: no extra files, tests or packages unless asked. The only package is openai.
- It runs with plain `node agent.ts`, on macOS and Linux, and on Windows inside WSL.
- Before you say something works, run it and check. If you're the agent in agent.ts and you've changed yourself, don't run a copy of yourself to test it: check the file still parses, then say when to restart you so we can try it together.
- Commit each step that works, with a short message.
