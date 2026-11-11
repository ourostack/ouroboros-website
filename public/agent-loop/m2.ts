// Milestone 2, conversation: the model remembers only what we send back, so we keep every message.
import OpenAI from "openai";
import * as readline from "node:readline";

const client = new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: process.env.COPILOT_API });
const messages: OpenAI.ChatCompletionMessageParam[] = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "you> " });
rl.prompt();

for await (const line of rl) {
  if (line.trim() === "") { rl.prompt(); continue; }
  messages.push({ role: "user", content: line });

  const response = await client.chat.completions.create({ model: "claude-sonnet-5.5", messages });
  const text = response.choices.map((c) => c.message.content ?? "").join("");

  messages.push({ role: "assistant", content: text });
  console.log(`agent> ${text}`);
  rl.prompt();
}
