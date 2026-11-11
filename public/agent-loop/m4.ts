// Milestone 4, the loop: run each tool the model asks for, send the result back, and repeat
// until the model answers without asking for a tool. That loop is the whole agent.
// Print the messages array after each turn with: SHOW_MESSAGES=1 node m4.ts   (or: node m4.ts --show-messages)
import OpenAI from "openai";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as readline from "node:readline";

const client = new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: process.env.COPILOT_API });
const MODEL = "claude-sonnet-5.5";
const MAX_ROUNDS = 20; // tool rounds per user turn, so a confused model can't loop forever
const SHOW_MESSAGES = process.env.SHOW_MESSAGES === "1" || process.argv.includes("--show-messages");
const SHELL = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
// Windows PowerShell 5.1 writes piped output in the OEM code page (437 on most PCs), which garbles accents and emoji.
const UTF8_OUTPUT = "try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}; ";

function tool(name: string, description: string, properties: Record<string, { type: "string" }>): OpenAI.ChatCompletionTool {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required: Object.keys(properties) } },
  };
}

const tools = [
  tool("read_file", "Read a text file and return its contents.", { path: { type: "string" } }),
  tool("write_file", "Write text to a file, replacing it if it exists.", { path: { type: "string" }, content: { type: "string" } }),
  tool("shell", `Run a command with ${SHELL} in the current folder and return its output.`, { command: { type: "string" } }),
];

function runShell(command: string): string {
  const result = spawnSync(SHELL, ["-c", process.platform === "win32" ? UTF8_OUTPUT + command : command], { encoding: "utf8", timeout: 30_000 });
  let output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error) output += `\nerror: ${result.error.message}`; // includes timeouts
  if (output.length > 10_000) output = `${output.slice(0, 10_000)}\n[output cut at 10 KB]`;
  if (result.status) output += `\n(exit code ${result.status})`;
  return output || "(no output, exit code 0)";
}

// Every problem becomes a string for the model to read, so one bad call can't crash the agent.
function runTool(name: string, rawArgs: string): string {
  let args;
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return `error: the arguments were not valid JSON: ${rawArgs}`;
  }
  try {
    if (name === "read_file") return readFileSync(args.path, "utf8");
    if (name === "write_file") { writeFileSync(args.path, args.content); return `wrote ${args.path}`; }
    if (name === "shell") return runShell(args.command);
    return `error: unknown tool "${name}"`;
  } catch (error) {
    return `error: ${(error as Error).message}`;
  }
}

const messages: OpenAI.ChatCompletionMessageParam[] = [];

async function runTurn() {
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const response = await client.chat.completions.create({ model: MODEL, messages, tools });
    // Claude can split one reply across several choices, so merge them.
    const text = response.choices.map((c) => c.message.content ?? "").join("");
    const toolCalls = response.choices.flatMap((c) => c.message.tool_calls ?? []);

    messages.push({ role: "assistant", content: text, tool_calls: toolCalls.length > 0 ? toolCalls : undefined });
    if (text) console.log(`agent> ${text}`);
    if (toolCalls.length === 0) return; // no tool calls means the model is done

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      console.log(`  [${call.function.name}] ${call.function.arguments}`);
      messages.push({ role: "tool", tool_call_id: call.id, content: runTool(call.function.name, call.function.arguments) });
    }
  }
  console.log(`(stopped after ${MAX_ROUNDS} tool rounds)`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "you> " });
rl.prompt();

for await (const line of rl) {
  if (line.trim() === "") { rl.prompt(); continue; }
  messages.push({ role: "user", content: line });
  await runTurn();
  if (SHOW_MESSAGES) console.log(JSON.stringify(messages, null, 2));
  rl.prompt();
}
