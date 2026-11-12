import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const agent = new URL('./agent.ts', import.meta.url);
const openai = new URL('./node_modules/openai/index.mjs', import.meta.url).href;
const systemMessage = (await readFile(new URL('./system-message.md', import.meta.url), 'utf8')).trim();

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'tiny-agent-test-'));
  // Run a copy of the agent, so each test controls the skills folder next to it.
  const app = join(directory, 'app');
  const skills = join(app, 'skills');
  await mkdir(skills, { recursive: true });
  for (const file of ['agent.ts', 'package.json', 'system-message.md']) {
    await copyFile(new URL(file, agent), join(app, file));
  }
  await symlink(fileURLToPath(new URL('node_modules', agent)), join(app, 'node_modules'));
  const historyFile = join(directory, 'what-the-model-sees.json');
  const callsFile = join(directory, 'calls.jsonl');
  const bootstrap = join(directory, 'bootstrap.mjs');
  const history = async () => JSON.parse(await readFile(historyFile, 'utf8'));
  const calls = async () => (await readFile(callsFile, 'utf8')).trim().split('\n').map(JSON.parse);
  await writeFile(bootstrap, `
    import assert from 'node:assert/strict';
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    import { readFileSync, appendFileSync } from 'node:fs';
    import OpenAI from ${JSON.stringify(openai)};
    const original = childProcess.execFileSync;
    childProcess.execFileSync = (command, args, options) => command === 'gh'
      ? (args[0] === 'auth' ? 'test-token' : 'https://example.invalid')
      : original(command, args, options);
    syncBuiltinESMExports();
    const setTimer = globalThis.setTimeout;
    globalThis.setTimeout = (callback, duration, ...args) =>
      setTimer(callback, duration === 30000 ? 150 : duration, ...args);
    globalThis.fetch = (url, options) => {
      assert.equal(options.signal, null);
      return Promise.resolve(new Response('{}'));
    };
    OpenAI.Models.prototype.list = async function() {
      await this._client.fetch('https://example.invalid', { signal: AbortSignal.abort() });
      return { data: [{ id: 'claude-opus-5.5', capabilities: { limits: { max_output_tokens: 128000 } } }] };
    };
    const scenario = JSON.parse(process.env.TEST_SCENARIO);
    let index = 0;
    OpenAI.Chat.Completions.prototype.create = async function(request) {
      try {
        assert.deepEqual(JSON.parse(readFileSync('what-the-model-sees.json', 'utf8')), request);
        assert.equal(request.stream, true);
        assert.equal(request.max_tokens, 128000);
        assert.equal(request.reasoning_effort, 'max');
        assert.deepEqual(request.tools.map(tool => tool.function.name), ['read_file', 'write_file', 'shell', 'get_current_time']);
      } catch (error) {
        // The agent recovers from API errors, so a failed check here has to stop it outright.
        console.error(error);
        process.exit(99);
      }
      appendFileSync('calls.jsonl', JSON.stringify(request) + '\\n');
      const step = scenario[Math.min(index++, scenario.length - 1)];
      const calls = step.calls || [];
      if (step.error) throw new Error(step.error);
      return (async function*() {
        yield { choices: [{ index: 0, delta: { role: 'assistant', reasoning_text: 'Thinking ',
          reasoning_opaque: 'opaque-', custom_field: 'keep-' }, finish_reason: null }] };
        yield { choices: [{ index: 0, delta: { reasoning_text: 'continues.', reasoning_opaque: 'tail',
          custom_field: 'me', content: calls.length ? null : (step.content || 'Done.'),
          tool_calls: calls.map((call, index) => ({ index: 1 + index * 2, id: call.id, type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.args).slice(0, 3) } })) },
          finish_reason: null }] };
        if (step.streamError) throw new Error(step.streamError);
        yield { choices: [{ index: 0, delta: {
          tool_calls: calls.map((call, index) => ({ index: 1 + index * 2,
            function: { arguments: JSON.stringify(call.args).slice(3) } })) },
          finish_reason: step.finish || (calls.length ? 'tool_calls' : 'stop') }] };
      })();
    };
  `);
  async function start(scenario, input = '', expectFailure = false) {
    const child = execFile(process.execPath, ['--import', pathToFileURL(bootstrap).href, join(app, 'agent.ts')], {
      cwd: directory,
      env: { ...process.env, TEST_SCENARIO: JSON.stringify(scenario) },
      maxBuffer: 4_000_000,
      timeout: 10_000,
    });
    child.stdin.end(input);
    const result = await new Promise(resolve => {
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', code => resolve({ code, stdout, stderr }));
    });
    assert.equal(result.code, expectFailure ? 1 : 0, result.stderr);
    return result;
  }
  try {
    await run({ directory, historyFile, history, calls, start, skills });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const tool = (id, name, args) => ({ id, name, args });
// On Windows the agent's shell tool runs PowerShell, so tests that send POSIX shell commands can't run there.
const posixShellOnly = process.platform === 'win32' && 'sends POSIX shell commands; the agent runs PowerShell on Windows';

test('runs all three tools, returns errors, preserves streamed thinking, and resumes chat', { skip: posixShellOnly }, async () => {
  await fixture(async ({ directory, history, calls, start }) => {
    await writeFile(join(directory, 'input.txt'), 'original text');
    const output = await start([
      { calls: [
        tool('read', 'read_file', { path: 'input.txt' }),
        tool('write', 'write_file', { path: 'output.txt', content: 'new text' }),
        tool('shell', 'shell', { command: 'printf shell-output; printf shell-error >&2; exit 7' }),
        tool('missing', 'read_file', { path: 'missing.txt' }),
        tool('invalid', 'write_file', { path: 'bad.txt', content: 123 }),
      ] },
      { calls: [tool('reread', 'read_file', { path: 'output.txt' })] },
      { content: 'All done.' },
    ], 'Do the work.\n');
    const saved = await history();
    assert.equal((await calls()).length, 3);
    const results = saved.messages.filter(message => message.role === 'tool');
    assert.equal(results[0].content, 'original text');
    assert.match(results[1].content, /Wrote 8 bytes/);
    const shell = JSON.parse(results[2].content);
    assert.equal(shell.exitCode, 7);
    assert.match(shell.output, /shell-output/);
    assert.match(shell.output, /shell-error/);
    assert.match(JSON.parse(results[3].content).error, /ENOENT/);
    assert.match(JSON.parse(results[4].content).error, /Invalid arguments/);
    assert.equal(results[5].content, 'new text');
    assert.equal(await readFile(join(directory, 'output.txt'), 'utf8'), 'new text');
    assert.match(output.stdout, /\[read_file\] "input.txt"/);
    assert.match(output.stdout, /\[write_file\] "output.txt"/);
    assert.match(output.stdout, /\[shell\]/);
    assert.match(output.stdout, /^Wren: All done\.$/m);
    assert.ok(!output.stdout.includes('original text'));
    for (const message of saved.messages.filter(message => message.role === 'assistant')) {
      assert.equal(message.reasoning_text, 'Thinking continues.');
      assert.equal(message.reasoning_opaque, 'opaque-tail');
      assert.equal(message.custom_field, 'keep-me');
    }
    await start([{ content: 'Welcome back.' }], 'Continue.\n');
    assert.deepEqual((await history()).messages.slice(0, saved.messages.length), saved.messages);
  });
});

test('bounds file and shell output without bounding model output', { skip: posixShellOnly }, async () => {
  await fixture(async ({ directory, history, start }) => {
    await writeFile(join(directory, 'large.txt'), 'a'.repeat(100_000));
    const command = `${JSON.stringify(process.execPath)} -e "process.stdout.write('b'.repeat(100000))"`;
    const answer = 'c'.repeat(40_000);
    const output = await start([
      { calls: [
        tool('read', 'read_file', { path: 'large.txt' }),
        tool('shell', 'shell', { command }),
      ] },
      { content: answer },
    ], 'Read and run.\n');
    const results = (await history()).messages.filter(message => message.role === 'tool');
    assert.equal(results[0].content.split('\n')[0].length, 16_000);
    assert.match(results[0].content, /truncated/);
    const shell = JSON.parse(results[1].content);
    assert.equal(shell.output.split('\n')[0].length, 16_000);
    assert.match(shell.output, /truncated/);
    assert.ok(output.stdout.includes(answer));
    assert.equal((await history()).messages.at(-1).content, answer);
  });
});

test('times out the shell and its descendants, then lets the model answer', { skip: posixShellOnly }, async () => {
  await fixture(async ({ directory, history, start }) => {
    const sleeper = `${JSON.stringify(process.execPath)} -e "setInterval(() => {}, 1000)"`;
    await start([
      { calls: [tool('slow', 'shell', { command: `${sleeper} & echo $! > child.pid; wait` })] },
      { content: 'Command timed out.' },
    ], 'Run a slow command.\n');
    const result = JSON.parse((await history()).messages.find(message => message.role === 'tool').content);
    assert.equal(result.timedOut, true, JSON.stringify(result));
    assert.equal(result.signal, 'SIGKILL');
    const pid = Number(await readFile(join(directory, 'child.pid'), 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  });
});

test('caps model rounds and resumes without repeating completed tools', async () => {
  await fixture(async ({ directory, history, calls, start }) => {
    await writeFile(join(directory, 'input.txt'), 'hello');
    const output = await start([
      { calls: [tool('read', 'read_file', { path: 'input.txt' })] },
    ], 'Keep reading.\n', true);
    assert.match(output.stderr, /Stopped after 12 model rounds/);
    assert.equal((await calls()).length, 12);
    assert.equal((await history()).messages.at(-1).role, 'tool');
    const resumed = await start([{ content: 'Finished.' }]);
    assert.ok(!resumed.stdout.includes('[read_file]'));
    assert.equal((await calls()).length, 13);
  });
});

test('recovers a partially completed tool batch from the old saved conversation', async () => {
  await fixture(async ({ directory, historyFile, history, start }) => {
    const saved = {
      model: 'claude-opus-5.5', reasoning_effort: 'max',
      messages: [
        { role: 'user', content: 'Read two files.' },
        { role: 'assistant', content: null, reasoning_text: 'Keep this.', reasoning_opaque: 'opaque',
          tool_calls: ['first', 'second'].map(id => ({
            id, type: 'function', function: { name: 'read_file', arguments: '{"path":"input.txt"}' },
          })) },
        { role: 'tool', tool_call_id: 'first', content: 'Previously read.' },
      ],
    };
    await writeFile(join(directory, 'input.txt'), 'Current text.');
    await writeFile(historyFile, JSON.stringify(saved));
    const output = await start([{ content: 'Both read.' }]);
    assert.equal(output.stdout.match(/\[read_file\]/g).length, 1);
    assert.deepEqual((await history()).messages.slice(1, 4), saved.messages);
    assert.equal((await history()).messages[4].tool_call_id, 'second');
  });
});

test('starts every conversation with the current system message', async () => {
  await fixture(async ({ historyFile, calls, start }) => {
    await start([{ content: 'Hi.' }], 'Hello.\n');
    for (const messages of [
      [{ role: 'system', content: 'Old instructions.' }, { role: 'user', content: 'Hello again.' }],
      [{ role: 'user', content: 'A conversation saved before system messages existed.' }],
    ]) {
      await writeFile(historyFile, JSON.stringify({ model: 'claude-opus-5.5', reasoning_effort: 'max', messages }));
      await start([{ content: 'Hi again.' }]);
    }
    const sent = (await calls()).map(request => request.messages);
    assert.equal(sent.length, 3);
    for (const messages of sent) {
      assert.deepEqual(messages[0], { role: 'system', content: systemMessage });
      assert.equal(messages.filter(message => message.role === 'system').length, 1);
    }
  });
});

test('streams replies, reports API errors, and keeps going', async () => {
  await fixture(async ({ history, calls, start }) => {
    const output = await start([
      { error: '500 Copilot is down' },
      { content: 'Partly there', streamError: 'connection reset' },
      { content: 'Cut off', finish: 'length' },
      { content: 'Back again.' },
    ], 'One.\nTwo.\nThree.\nFour.\n');
    assert.match(output.stderr, /Copilot API error: 500 Copilot is down/);
    assert.match(output.stderr, /Copilot API error: connection reset/);
    assert.match(output.stderr, /finish reason: length/);
    assert.equal(output.stderr.match(/Send another message to keep going/g).length, 3);
    assert.ok(output.stdout.includes('\x1b[2mThinking continues.\x1b[22m\nWren: Partly there\n'));
    assert.ok(output.stdout.includes('\x1b[2mThinking continues.\x1b[22m\nWren: Back again.\n'));
    assert.deepEqual((await history()).messages.slice(1).map(message => [message.role, message.content]), [
      ['user', 'One.'], ['user', 'Two.'], ['user', 'Three.'], ['user', 'Four.'], ['assistant', 'Back again.'],
    ]);
    assert.equal((await calls()).length, 4);
  });
});

test('lists valid skills by name and description, and skips broken ones', async () => {
  await fixture(async ({ skills, calls, start }) => {
    const skill = async (folder, text) => {
      await mkdir(join(skills, folder));
      if (text) await writeFile(join(skills, folder, 'SKILL.md'), text);
    };
    await skill('making-tea', '---\nname: making-tea\ndescription: >-\n  Brews tea <hot> & strong.\n  Use when Ari is tired.\nlicense: MIT\n---\n# Making tea\nBoil the water first.\n');
    await skill('wrong-name', '---\nname: right-name\ndescription: Mismatched.\n---\n');
    await skill('no-description', '---\nname: no-description\n---\n');
    await skill('bad--name', '---\nname: bad--name\ndescription: Two hyphens in a row.\n---\n');
    await skill('no-header', 'Just instructions.\n');
    await skill('no-skill-file');
    await writeFile(join(skills, 'README.md'), 'Not a skill.');
    const output = await start([{ content: 'Hi.' }], 'Hello.\n');
    const system = (await calls())[0].messages[0].content;
    assert.ok(system.startsWith(`${systemMessage}\n\nSkills\n`));
    // Windows tmpdir() is an 8.3 short path that realpath expands, so compare resolved paths.
    const listed = system.match(/Your skills live in (.+)\. To add one, create a folder there/);
    assert.ok(listed);
    assert.equal(await realpath(listed[1]), await realpath(skills));
    assert.ok(system.includes([
      '<available_skills>',
      '  <skill>',
      '    <name>making-tea</name>',
      '    <description>Brews tea &lt;hot&gt; &amp; strong. Use when Ari is tired.</description>',
      `    <location>${await realpath(join(skills, 'making-tea', 'SKILL.md'))}</location>`,
      '  </skill>',
      '</available_skills>',
    ].join('\n')), system);
    assert.ok(!system.includes('Boil the water'));
    for (const folder of ['bad--name', 'no-description', 'no-header', 'no-skill-file', 'wrong-name']) {
      assert.match(output.stderr, new RegExp(`Skipping skill ${folder}:`));
    }
    assert.doesNotMatch(output.stderr, /README/);
  });
});

test('get_current_time reports the date and time in any time zone', async () => {
  await fixture(async ({ history, start }) => {
    const output = await start([
      { calls: [
        tool('local', 'get_current_time', { time_zone: 'local' }),
        tool('tokyo', 'get_current_time', { time_zone: 'Asia/Tokyo' }),
        tool('utc', 'get_current_time', { time_zone: 'UTC' }),
        tool('mars', 'get_current_time', { time_zone: 'Mars/Olympus_Mons' }),
        tool('blank', 'get_current_time', { time_zone: ' ' }),
      ] },
      { content: 'Done.' },
    ], 'What time is it?\n');
    const results = (await history()).messages.filter(message => message.role === 'tool')
      .map(message => message.content);
    const zones = [Intl.DateTimeFormat().resolvedOptions().timeZone, 'Asia/Tokyo', 'UTC'];
    for (const [index, zone] of zones.entries()) {
      const [readable, iso, timeZone] = results[index].split('\n');
      assert.match(readable, /^\w+day, \w+ \d{1,2}, \d{4} at \d{1,2}:\d{2}:\d{2}/);
      const stamp = iso.replace('ISO 8601: ', '');
      assert.match(stamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      assert.ok(Math.abs(Date.parse(stamp) - Date.now()) < 60_000, stamp);
      assert.equal(timeZone, `Time zone: ${zone}`);
    }
    assert.match(results[1], /\+09:00$/m);
    assert.match(results[2], /\+00:00$/m);
    assert.match(JSON.parse(results[3]).error, /Invalid time zone/);
    assert.match(JSON.parse(results[4]).error, /time_zone must not be empty/);
    assert.match(output.stdout, /\[get_current_time\] "local"/);
  });
});
