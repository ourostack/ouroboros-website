import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const distDir = path.join(process.cwd(), 'dist', 'agent-loop');
const files = ['agent.ts', 'package.json'];
const read = (name) => fs.readFileSync(path.join(distDir, name), 'utf8');

test('the finished agent and its package.json are served', () => {
  for (const name of files) {
    assert.ok(fs.existsSync(path.join(distDir, name)), `dist/agent-loop/${name} is missing`);
  }
});

test('package.json is the grow-an-agent ESM package with the openai client', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'grow-an-agent');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.dependencies.openai, '^7.50.0');
});

test('no milestone files or preflight script remain', () => {
  for (const name of ['preflight.mjs', 'm1.ts', 'm2.ts', 'm3.ts', 'm4.ts']) {
    assert.ok(!fs.existsSync(path.join(distDir, name)), `dist/agent-loop/${name} should be gone`);
  }
});

test('agent.ts carries the safety rules', () => {
  const src = read('agent.ts');
  assert.match(src, /MAX_ROUNDS\s*=\s*20\b/, 'round limit of 20');
  assert.match(src, /timeout:\s*30_?000/, '30 s shell timeout');
  assert.match(src, /10_?000/, '10 KB output cap');
  assert.match(src, /powershell\.exe/, 'powershell.exe on Windows');
  assert.match(src, /\/bin\/sh/, '/bin/sh elsewhere');
  assert.match(src, /try\s*{\s*args\s*=\s*JSON\.parse\(/, 'JSON.parse inside try');
  assert.match(src, /unknown tool/, 'unknown tools return an error string');
  assert.match(src, /exit code/, 'non-zero exit code reported');
  assert.match(src, /description[^\n]*\$\{SHELL\}|`[^`\n]*\$\{SHELL\}[^`\n]*`/, 'shell tool description names the shell');
  assert.match(src, /choices\.map\(/, 'reads every choice for text');
  assert.match(src, /choices\.flatMap\(/, 'reads every choice for tool calls');
  assert.doesNotMatch(src, /choices\[0\]/, 'never reads only choices[0]');
  assert.match(src, /OutputEncoding\s*=\s*\[Text\.Encoding\]::UTF8/, 'PowerShell output is switched to UTF-8');
  assert.match(src, /"-NoProfile"/, 'PowerShell skips the user profile');
  assert.match(src, /"-NonInteractive"/, 'PowerShell runs non-interactively');
  assert.match(src, /"-Command"/, 'PowerShell gets the command with -Command');
  assert.match(src, /\["-c"\]/, '/bin/sh keeps -c');
});

test('agent.ts gets its token and Copilot address from gh, not from environment variables', () => {
  const src = read('agent.ts');
  assert.match(src, /gh\("auth", "token"\)/, 'token from gh auth token');
  assert.match(src, /gh\("api", "\/copilot_internal\/user", "--jq", "\.endpoints\.api"\)/, 'endpoint from gh api');
  assert.match(src, /execFileSync\("gh"/, 'runs gh without a shell');
  assert.match(src, /gh auth login/, 'a failed gh call says what to run');
  assert.doesNotMatch(src, /process\.env\.(GITHUB_TOKEN|COPILOT_API|OPENAI_API_KEY)/, 'no environment variables to set by hand');
  assert.match(src, /claude-sonnet-5\.5/, 'the guide model');
});

test('no served file contains a secret', () => {
  for (const name of files) {
    assert.doesNotMatch(read(name), /ghp_|gho_|github_pat_|sk-/, `${name} looks like it holds a secret`);
  }
});
