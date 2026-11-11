// Milestone 1, first contact: send one message, print one reply.
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: process.env.COPILOT_API });

const response = await client.chat.completions.create({
  model: "claude-sonnet-5.5",
  messages: [{ role: "user", content: "What is the secret word in secret.txt?" }],
});

// Claude can split one reply across several choices, so join them.
console.log(response.choices.map((c) => c.message.content ?? "").join(""));
