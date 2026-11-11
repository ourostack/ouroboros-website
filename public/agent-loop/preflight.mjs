// Grow an agent: preflight check. Run it with: node preflight.mjs
// Plain JavaScript on purpose, so even an old Node can run it and tell you to upgrade.

const MODEL = "claude-sonnet-5.5";
let ok = true;

const pass = (msg) => console.log(`✅ ${msg}`);
const warn = (msg, fix) => console.log(`⚠️  ${msg}${fix ? `\n   ${fix}` : ""}`);
const fail = (msg, fix) => {
  ok = false;
  console.log(`❌ ${msg}${fix ? `\n   ${fix.replace(/\n/g, "\n   ")}` : ""}`);
};
const finish = () => {
  console.log(ok ? "\n🎉 All set. Start with: node m1.ts" : "\n🛑 Fix the ❌ items above, then run node preflight.mjs again.");
  process.exit(ok ? 0 : 1);
};

const SET_VARS = `Set them, then run this again.
bash / zsh:
  export GITHUB_TOKEN=$(gh auth token)
  export COPILOT_API=$(gh api /copilot_internal/user --jq .endpoints.api)
PowerShell:
  $env:GITHUB_TOKEN = gh auth token
  $env:COPILOT_API = gh api /copilot_internal/user --jq .endpoints.api`;

// One-line fixes for the errors people hit most.
const FIXES = {
  400: "The request was rejected. Check that COPILOT_API came from the gh api line above and that your Copilot plan allows " + MODEL + ".",
  401: "The token isn't valid. Run `gh auth login`, then set GITHUB_TOKEN again.",
  403: "This account doesn't have Copilot access. Use an account that does.",
  429: "This account is out of quota. Run `unset GH_TOKEN`, then `export GITHUB_TOKEN=$(gh auth token --user <name>)` (`gh auth status` lists your accounts).",
};

// 1. Node version: the .ts files need Node 22.18+ to run TypeScript directly.
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 18)) pass(`Node ${process.versions.node}`);
else {
  fail(`Node ${process.versions.node} is too old. You need 22.18 or newer.`, "Install the current LTS from https://nodejs.org");
  finish();
}

// 2. The openai package.
try {
  await import("openai");
  pass("openai package is installed");
} catch {
  fail("The openai package isn't installed in this folder.", "Run: npm install openai");
}

// 3. Environment variables.
if (process.env.GH_TOKEN) warn("GH_TOKEN is set. It overrides `gh auth token`, so you may be using a different account than you expect.", "To use your gh login instead: unset GH_TOKEN   (PowerShell: Remove-Item Env:GH_TOKEN)");

const { GITHUB_TOKEN, COPILOT_API } = process.env;
const missing = [!GITHUB_TOKEN && "GITHUB_TOKEN", !COPILOT_API && "COPILOT_API"].filter(Boolean);
if (missing.length > 0) {
  fail(`${missing.join(" and ")} ${missing.length > 1 ? "aren't" : "isn't"} set.`, SET_VARS);
  finish();
}
pass("GITHUB_TOKEN and COPILOT_API are set");

// 4. Which GitHub account is this token for?
try {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "grow-an-agent-preflight" },
  });
  if (res.ok) pass(`Token belongs to GitHub account: ${(await res.json()).login}`);
  else warn(`Couldn't look up the token's account (HTTP ${res.status}).`);
} catch (error) {
  warn(`Couldn't reach api.github.com: ${error.cause?.message ?? error.message}`);
}

// 5. One real model call.
try {
  const res = await fetch(`${COPILOT_API.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "Reply with one word: hello" }] }),
  });
  if (res.ok) {
    const data = await res.json();
    // Claude can split one reply across several choices, so join them.
    const reply = data.choices.map((c) => c.message.content ?? "").join("").trim();
    pass(`${MODEL} replied: "${reply}"`);
  } else {
    const body = (await res.text()).trim().slice(0, 200);
    fail(`The model call failed with HTTP ${res.status}.`, `${FIXES[res.status] ?? "Unexpected error."}\nServer said: ${body}`);
  }
} catch (error) {
  fail(`Couldn't reach ${COPILOT_API}: ${error.cause?.message ?? error.message}`, "Check your network, and that COPILOT_API is a URL like https://api.githubcopilot.com");
}

finish();
