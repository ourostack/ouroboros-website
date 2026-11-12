---
name: adding-tools
description: Adds a new tool to Wren by editing agent.ts, testing it and committing. Use when Ari asks for a new tool, or when a task keeps needing something the current tools can't do well.
---

# Adding a tool

Tools are the functions the model can call. They're defined and run in agent.ts, which sits next to the skills folder. The code is the source of truth, so read agent.ts before you change anything. If this skill no longer matches the code, follow the code and then fix this skill.

## Decide first

- For one-off jobs, use shell. Add a tool when a job comes up often, needs guardrails, or produces output that shell handles badly.
- Keep it small: one clear job, a short snake_case name, and a description that says what it does and when to use it. The model only sees the name, description and parameters.

## Steps

1. Define it. Add an entry to the `request.tools` array: `{ name, description, properties }`, where each property is `{ type: 'string', description }`. The `.map` after the array turns each entry into a strict function schema: every property is required and extra ones are rejected.
2. Accept its arguments. In `runTool`, add the tool's name and argument keys to the `keys` chain. Give every tool at least one argument, because an empty key list means "unknown tool". Arguments are checked by `isStringArguments`, which only allows strings. If you need other types, change that check and the schema together.
3. Pick what to log. `runTool` prints `[name] target` and rejects an empty target. Today it's `command` for shell, `time_zone` for get_current_time and `path` for the rest. If your tool has none of these, add a case to `targetKey`, or every call will fail.
4. Run it. Add a branch in `runTool` that does the work and returns a string. That string is the tool result the model sees.
   - Every tool has its own explicit branch, and anything unmatched throws at the end. Keep it that way, so nothing can fall into another tool's branch.
   - Bound anything that could be large with `boundedText` and `maxToolOutputBytes`.
   - Throw on failure. `runTool` catches errors and returns `{ error }` to the model, so the conversation keeps going.
   - If it starts a process, follow `runShell` for timeouts and for killing the whole process group.
5. Test it in agent.test.mjs.
   - The fake API checks the exact list of tool names, in order. Add yours.
   - Add a test that calls the tool through a scenario, for example `start([{ calls: [tool('id', 'your_tool', { ... })] }, { content: 'Done.' }], 'Go.\n')`. Then check the saved tool result in `history()` and the `[your_tool]` log line in stdout.
   - Cover the error path too.
   - Run `npm test` until everything passes.
6. Commit with a short imperative message, like "Add list_files tool".
7. Tell Ari to restart. The tool doesn't exist until Ari does, so don't try to call it before then.
