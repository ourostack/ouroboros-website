// agent.ts: a tiny agent you can read in one sitting. Run it with: node agent.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import OpenAI from "openai";

// The model lives on someone else's computer. Your GitHub Copilot sign-in gives us its address and a key.
const model = new OpenAI({
  apiKey: run("gh auth token"),
  baseURL: run("gh api /copilot_internal/user --jq .endpoints.api"),
});

// The conversation: everything said so far. The model remembers nothing,
// so we send all of it every time, and save it so it survives a restart.
const conversation = existsSync("what-the-model-sees.json")
  ? JSON.parse(readFileSync("what-the-model-sees.json", "utf8")).messages
  : [];

const keyboard = createInterface({ input: process.stdin, output: process.stdout });
keyboard.on("close", () => process.exit(0)); // Ctrl+D or Ctrl+C quits

// THE AGENT. This loop is the whole idea.
while (true) {
  // You say something.
  conversation.push({ role: "user", content: await keyboard.question("You: ") });

  // The model answers. If it asks to use a tool, we use it, hand back what happened, and ask again.
  while (true) {
    const reply = await askTheModel();
    conversation.push(reply);
    if (!reply.tool_calls) break; // It answered without asking for anything: your turn.

    for (const request of reply.tool_calls) {
      const result = useTool(request.function.name, request.function.arguments);
      conversation.push({ role: "tool", tool_call_id: request.id, content: result });
    }
  }

  save();
}

// Everything below is the plumbing the loop uses.

// The tools: what the model may ask us to do. It only sees these names and descriptions.
function tools() {
  return [
    tool("read_file", "Read a text file.", ["path"]),
    tool("write_file", "Write a text file, replacing what's in it.", ["path", "content"]),
    tool("shell", `Run a command in ${process.platform === "win32" ? "PowerShell" : "the terminal"}.`, ["command"]),
  ];
}

// Do what the model asked, and return what happened as text it can read.
function useTool(name, argumentsText) {
  console.log(`[${name}]`);
  try {
    const input = JSON.parse(argumentsText || "{}");
    if (name === "read_file") return readFileSync(input.path, "utf8");
    if (name === "write_file") {
      writeFileSync(input.path, input.content);
      return "Done.";
    }
    if (name === "shell") {
      // Stop a command after 30 seconds, and keep its output to a sensible size.
      const shell = process.platform === "win32" ? ["pwsh", "-Command"] : [process.env.SHELL || "sh", "-c"];
      const done = spawnSync(shell[0], [shell[1], input.command], { encoding: "utf8", timeout: 30_000 });
      if (done.error) return `Error: ${done.error.message}`;
      return (done.stdout + done.stderr).slice(0, 20_000) || "(no output)";
    }
    return `There's no tool called ${name}.`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Send the whole conversation, and print the reply as it arrives: its thinking dimmed, then its words.
async function askTheModel() {
  const stream = await model.chat.completions.create({
    model: "claude-opus-5.5",
    reasoning_effort: "max", // think as hard as it can, so there's plenty to watch
    max_tokens: 128_000,
    stream: true,
    tools: tools(),
    messages: conversation,
  });

  const reply = { role: "assistant", content: "" };
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta ?? {};
    if (piece.reasoning_text) process.stdout.write(`\x1b[2m${piece.reasoning_text}\x1b[0m`);
    if (piece.content) process.stdout.write(piece.content);

    // Keep everything it said, including its sealed thinking, so it can pick up where it left off.
    for (const key of ["content", "reasoning_text", "reasoning_opaque"]) {
      if (piece[key]) reply[key] = (reply[key] ?? "") + piece[key];
    }

    // A tool request arrives in pieces too. Put each one back together.
    for (const part of piece.tool_calls ?? []) {
      reply.tool_calls ??= [];
      reply.tool_calls[part.index] ??= { id: "", type: "function", function: { name: "", arguments: "" } };
      const request = reply.tool_calls[part.index];
      request.id += part.id ?? "";
      request.function.name += part.function?.name ?? "";
      request.function.arguments += part.function?.arguments ?? "";
    }
  }
  console.log();
  if (reply.tool_calls) reply.tool_calls = reply.tool_calls.filter(Boolean);
  return reply;
}

// Save exactly what the model sees, so you can open it and look.
function save() {
  const request = { model: "claude-opus-5.5", tools: tools(), messages: conversation };
  writeFileSync("what-the-model-sees.json", JSON.stringify(request, null, 2));
}

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function tool(name, description, inputs) {
  const properties = Object.fromEntries(inputs.map((input) => [input, { type: "string" }]));
  return { type: "function", function: { name, description, parameters: { type: "object", properties, required: inputs } } };
}
