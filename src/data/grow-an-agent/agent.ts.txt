import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import OpenAI from "openai";

// Use gh's signed-in account without saving its token to a file.
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const client = new OpenAI({
  apiKey: gh("auth", "token"),
  baseURL: gh("api", "/copilot_internal/user", "--jq", ".endpoints.api"),
});

// The saved request holds the whole conversation, including thinking.
const file = "what-the-model-sees.json";
const request = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {
  model: "claude-opus-5.5",
  reasoning_effort: "max",
  max_tokens: 128000,
  messages: [],
  stream: true,
};

// Refresh tool definitions on resume so the model sees the current tools.
const tool = (name, description, properties) => ({
  type: "function",
  function: {
    name, description,
    parameters: {
      type: "object", properties, required: Object.keys(properties), additionalProperties: false,
    },
  },
});
const shell = process.platform === "win32" ? "pwsh" : process.env.SHELL || "/bin/sh";
const shellArgs = process.platform === "win32" ? ["-NoLogo", "-NoProfile", "-Command"] : ["-c"];
request.tools = [
  tool("read_file", "Read a UTF-8 text file.", { path: { type: "string" } }),
  tool("write_file", "Write a UTF-8 text file, replacing its contents.", {
    path: { type: "string" }, content: { type: "string" },
  }),
  tool("shell", `Run a command using ${shell}.`, {
    command: { type: "string" },
  }),
];
request.parallel_tool_calls = false; // Run tools in order so later tools see earlier changes.

const save = () => writeFileSync(file, JSON.stringify(request, null, 2));

// The agent loop: run pending tools, ask the model, and repeat until it answers.
async function agentLoop() {
  for (let round = 0; ; round++) {
    // Skip saved results so resuming does not repeat finished tools.
    const assistant = request.messages.findLast(message => message.role === "assistant");
    const results = new Set(request.messages.filter(message => message.role === "tool").map(message => message.tool_call_id));
    for (const call of assistant?.tool_calls ?? []) {
      if (results.has(call.id)) continue;
      request.messages.push({ role: "tool", tool_call_id: call.id, content: runTool(call) });
      save();
    }
    // Pause runaway tool use, leaving the conversation ready to continue.
    if (round === 10) {
      console.error("Stopped at the 10-round limit. Ask it to carry on.");
      return;
    }
    if (!await reply() || !request.messages.at(-1)?.tool_calls) return;
  }
}

// Return tool failures as text so the model can correct its next attempt.
function runTool(call) {
  console.log(`[tool] ${call.function.name}`);
  let output;
  try {
    const args = JSON.parse(call.function.arguments);
    if (call.function.name === "read_file") {
      output = readFileSync(args.path, "utf8");
    } else if (call.function.name === "write_file") {
      writeFileSync(args.path, args.content, "utf8");
      output = `Wrote ${args.path}`;
    } else if (call.function.name === "shell") {
      // Bound runtime and output so a command cannot stall or flood the agent.
      const result = spawnSync(shell, [...shellArgs, args.command], {
        encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024,
      });
      output = `Exit: ${result.status}; signal: ${result.signal}\n${result.stdout ?? ""}${result.stderr ?? ""}`;
      if (result.error) output = `Error: ${result.error.message}\n${output}`;
    } else {
      throw new Error(`Unknown tool: ${call.function.name}`);
    }
  } catch (error) {
    output = `Error: ${error.message}`;
  }
  if (output.startsWith("Error:")) console.error(output.split("\n")[0]);
  // Keep the conversation usable when a file or command produces huge output.
  return output.length > 12000 ? output.slice(0, 12000) + "\n[truncated at 12000 characters]" : output;
}

async function reply() {
  // Save exactly what goes to the model before starting the call.
  save();
  const stream = await client.chat.completions.create(request);
  const message = { role: "assistant", content: "" };
  const calls = new Map();
  let finish;
  try {
    for await (const chunk of stream) {
      const { delta, finish_reason } = chunk.choices[0] ?? {};
      if (finish_reason) finish = finish_reason;
      if (!delta) continue;
      // Keep both readable thinking and its opaque signature for later turns.
      for (const key of ["content", "reasoning_text", "reasoning_opaque"]) {
        if (typeof delta[key] === "string") message[key] = (message[key] ?? "") + delta[key];
      }
      // Tool names and JSON arguments arrive in pieces, just like answer text.
      for (const part of delta.tool_calls ?? []) {
        if (!calls.has(part.index)) calls.set(part.index, {
          id: "", type: "function", function: { name: "", arguments: "" },
        });
        const call = calls.get(part.index);
        if (part.id) call.id = part.id;
        if (part.function?.name) call.function.name += part.function.name;
        if (part.function?.arguments) call.function.arguments += part.function.arguments;
      }
      if (delta.reasoning_text) process.stdout.write(`\x1b[2m${delta.reasoning_text}\x1b[0m`);
      if (delta.content) process.stdout.write(delta.content);
    }
  } catch (error) {
    finish = `stream error: ${error.message}`;
  }
  process.stdout.write("\n");
  if (calls.size && finish === "tool_calls") message.tool_calls = [...calls.values()];
  request.messages.push(message);
  // Checkpoint the completed reply too, so quitting loses no finished turns.
  save();
  if (finish === "stop" || finish === "tool_calls") return true;
  const reason = finish === "length" ? "output token limit reached" : finish ?? "stream ended without a finish reason";
  console.error(`Reply stopped: ${reason}. Ask it to carry on.`);
  return false;
}

// Resume unfinished work before accepting another user message.
const last = request.messages.at(-1);
if (last && (last.role !== "assistant" || last.tool_calls)) await agentLoop();

// Keep accepting user turns, with each turn driving the same agent loop.
const terminal = createInterface({ input: process.stdin, output: process.stdout, prompt: "You: " });
terminal.prompt();
for await (const content of terminal) {
  request.messages.push({ role: "user", content });
  await agentLoop();
  terminal.prompt();
}
