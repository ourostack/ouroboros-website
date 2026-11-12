import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// The guide has readers grow their own agent; it offers no half-built one to download.
test('no agent bundle is served', () => {
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'public', 'agent-loop')), 'public/agent-loop/ is back');
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'dist', 'agent-loop')), 'dist/agent-loop/ is served');
});
