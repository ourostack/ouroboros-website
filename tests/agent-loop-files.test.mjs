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

test('package.json is an ESM package with the openai client', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.dependencies?.openai, 'no openai dependency');
});

test('no milestone files or preflight script remain', () => {
  for (const name of ['preflight.mjs', 'm1.ts', 'm2.ts', 'm3.ts', 'm4.ts']) {
    assert.ok(!fs.existsSync(path.join(distDir, name)), `dist/agent-loop/${name} should be gone`);
  }
});

// agent.ts is whatever the coding agent wrote when Ari followed the guide, so these
// pin what the prompts ask for, not how any one run spelled it.
test('agent.ts has the three tools and the guardrails the loop prompt asks for', () => {
  const src = read('agent.ts');
  for (const tool of ['read_file', 'write_file', 'shell']) assert.ok(src.includes(tool), `no ${tool} tool`);
  assert.match(src, /round/i, 'no cap on tool rounds');
  assert.match(src, /timeout/i, 'no timeout on slow commands');
  assert.match(src, /JSON\.parse\(/, 'never parses tool arguments');
});

test('agent.ts gets its token and Copilot address from gh, not from environment variables', () => {
  const src = read('agent.ts');
  assert.match(src, /["']auth["'],\s*["']token["']|gh auth token/, 'token from gh auth token');
  assert.match(src, /\/copilot_internal\/user/, 'endpoint from gh api /copilot_internal/user');
  assert.doesNotMatch(src, /process\.env\.(GITHUB_TOKEN|COPILOT_API|OPENAI_API_KEY)/, 'no environment variables to set by hand');
});

// Pending the dry run: the controller replaces agent.ts with the file Ari's build ended with.
test('agent.ts uses the model the guide prompts name', () => {
  assert.match(read('agent.ts'), /claude-opus-5\.5/, 'pending dry run: public/agent-loop/agent.ts still has the old model');
});

test('no served file contains a secret', () => {
  for (const name of files) {
    assert.doesNotMatch(read(name), /ghp_|gho_|github_pat_|sk-/, `${name} looks like it holds a secret`);
  }
});
