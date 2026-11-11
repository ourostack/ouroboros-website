// Milestone 3, one tool: the model can now ask us to read a file. We run it... and then stop.
import OpenAI from "openai";
import { readFileSync } from "node:fs";

const client = new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: process.env.COPILOT_API });

// A tool is just a name, a description and a JSON Schema for its arguments.
const tools: OpenAI.ChatCompletionTool[] = [{
  type: "function",
  function: {
    name: "read_file",
    description: "Read a text file and return its contents.",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
}];

const response = await client.chat.completions.create({
  model: "claude-sonnet-5.5",
  messages: [{ role: "user", content: "What is the secret word in secret.txt?" }],
  tools,
});

const text = response.choices.map((c) => c.message.content ?? "").join("");
const toolCalls = response.choices.flatMap((c) => c.message.tool_calls ?? []);

if (text) console.log(`agent> ${text}`);

for (const call of toolCalls) {
  if (call.type !== "function") continue;
  console.log("The model asked for a tool call:");
  console.log(JSON.stringify(call, null, 2));

  const { path } = JSON.parse(call.function.arguments);
  console.log(`\nWe ran read_file("${path}") and got:\n${readFileSync(path, "utf8")}`);
}

if (toolCalls.length > 0) console.log("...but we never sent the result back, so the model never answers. That's milestone 4.");
