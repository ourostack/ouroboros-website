import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { open, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { parse as parseYaml } from 'yaml';
import type { Dirent } from 'node:fs';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageFunctionToolCall,
} from 'openai/resources/chat/completions';

const assistantName = 'Wren';
const systemMessageFile = new URL('system-message.md', import.meta.url);
const skillsDirectory = fileURLToPath(new URL('skills', import.meta.url));
const historyFile = 'what-the-model-sees.json';
const maxRounds = 12;
const commandTimeoutMs = 30_000;
const maxToolOutputBytes = 16_000;
// Added after the dry run so the file runs on Windows too: PowerShell there, $SHELL elsewhere.
const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/sh';
const shellArguments = (command: string): string[] =>
  process.platform === 'win32'
    ? ['-NoProfile', '-Command', `try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}; ${command}`]
    : ['-c', command];

type AssistantMessage = ChatCompletionAssistantMessageParam & Record<string, unknown>;

function isRequest(value: unknown): value is ChatCompletionCreateParamsStreaming {
  return typeof value === 'object' && value !== null
    && 'model' in value && value.model === 'claude-opus-5.5'
    && 'reasoning_effort' in value && value.reasoning_effort === 'max'
    && 'messages' in value && Array.isArray(value.messages)
    && value.messages.every((message, index) => typeof message === 'object' && message !== null
      && ((message.role === 'system' && index === 0 && typeof message.content === 'string')
        || (message.role === 'user' && typeof message.content === 'string')
        || (message.role === 'assistant'
          && (typeof message.content === 'string' || message.content === null
            || message.content === undefined)
          && (typeof message.content === 'string'
            || (Array.isArray(message.tool_calls) && message.tool_calls.length > 0)))
        || (message.role === 'tool' && typeof message.content === 'string'
          && typeof message.tool_call_id === 'string')));
}

async function loadConversation(): Promise<ChatCompletionCreateParamsStreaming> {
  let saved: string;
  try {
    saved = await readFile(historyFile, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { model: 'claude-opus-5.5', reasoning_effort: 'max', stream: true, messages: [] };
    }
    throw error;
  }
  const request: unknown = JSON.parse(saved);
  if (!isRequest(request)) {
    throw new Error(`Invalid conversation in ${historyFile}; refusing to overwrite it.`);
  }
  request.stream = true;
  return request;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Agent Skills (agentskills.io): the system message lists each skill's name and description,
// and the model reads the full SKILL.md only when a task calls for it.
async function describeSkills(): Promise<string> {
  let entries: Dirent[] = [];
  try {
    entries = await readdir(skillsDirectory, { withFileTypes: true });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const folders = entries.filter(entry => !entry.name.startsWith('.')
    && (entry.isDirectory() || entry.isSymbolicLink())).map(entry => entry.name).sort();
  const skills: string[] = [];
  for (const folder of folders) {
    const location = join(skillsDirectory, folder, 'SKILL.md');
    try {
      const header = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(await readFile(location, 'utf8'));
      if (!header) throw new Error('SKILL.md must start with a header between --- lines.');
      const fields: unknown = parseYaml(header[1]);
      const { name, description } = (typeof fields === 'object' && fields !== null ? fields : {}) as Record<string, unknown>;
      if (typeof name !== 'string' || name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        throw new Error('name must be up to 64 lowercase letters, digits and single hyphens.');
      }
      if (name !== folder) throw new Error(`name "${name}" must match the folder name.`);
      if (typeof description !== 'string' || !description.trim() || description.length > 1024) {
        throw new Error('description must be 1 to 1024 characters.');
      }
      skills.push([
        '  <skill>',
        `    <name>${name}</name>`,
        `    <description>${escapeXml(description.trim())}</description>`,
        `    <location>${escapeXml(location)}</location>`,
        '  </skill>',
      ].join('\n'));
    } catch (error) {
      console.error(`Skipping skill ${folder}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!skills.length) return '';
  return [
    'Skills',
    `Skills are folders of instructions for particular tasks, in the Agent Skills format (agentskills.io). Here you only see each skill's name and description. When a task matches a description, read that skill's SKILL.md with read_file before you start, then follow it. Paths inside a skill are relative to its folder.`,
    `Your skills live in ${skillsDirectory}. To add one, create a folder there holding a SKILL.md that starts with a header between --- lines, with a name (lowercase with hyphens, matching the folder name) and a description (what it does and when to use it), followed by the instructions. Names and descriptions are read when you start, so new skills show up after a restart. Edits to a skill's instructions apply the next time you read it.`,
    '<available_skills>',
    ...skills,
    '</available_skills>',
  ].join('\n');
}

const request = await loadConversation();
// Reread the standing instructions and skills on every start, so edits reach saved conversations too.
const systemMessage = (await readFile(systemMessageFile, 'utf8')).trim();
if (!systemMessage) throw new Error('system-message.md is empty.');
const skills = await describeSkills();
if (request.messages[0]?.role === 'system') request.messages.shift();
request.messages.unshift({ role: 'system', content: skills ? `${systemMessage}\n\n${skills}` : systemMessage });
request.tools = [
  {
    name: 'read_file',
    description: 'Read a UTF-8 text file from disk. Relative paths are resolved from the current working directory.',
    properties: {
      path: { type: 'string', description: 'The path of the text file to read.' },
    },
  },
  {
    name: 'write_file',
    description: 'Write UTF-8 text to a file, creating it or replacing its contents. Relative paths are resolved from the current working directory.',
    properties: {
      path: { type: 'string', description: 'The path of the text file to write.' },
      content: { type: 'string', description: 'The complete text to write.' },
    },
  },
  {
    name: 'shell',
    description: `Run a command using ${shell} in the current working directory. Commands time out after ${commandTimeoutMs / 1000} seconds; output is limited to ${maxToolOutputBytes} bytes.`,
    properties: {
      command: { type: 'string', description: 'The shell command to execute.' },
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time, with the weekday and UTC offset. Use it whenever the date or time matters, instead of guessing.',
    properties: {
      time_zone: { type: 'string', description: 'An IANA time zone such as "Europe/London", or "local" for this computer\'s time zone.' },
    },
  },
].map(({ name, description, properties }) => ({
  type: 'function',
  function: {
    name,
    description,
    parameters: {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
    strict: true,
  },
}));
request.parallel_tool_calls = false;
delete request.max_completion_tokens;

async function saveConversation(): Promise<void> {
  await writeFile(`${historyFile}.tmp`, `${JSON.stringify(request, null, 2)}\n`, { mode: 0o600 });
  await rename(`${historyFile}.tmp`, historyFile);
}

function gh(...args: string[]): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const client = new OpenAI({
  apiKey: gh('auth', 'token'),
  baseURL: gh('api', '/copilot_internal/user', '--jq', '.endpoints.api'),
  defaultHeaders: { 'Copilot-Integration-Id': 'copilot-chat' },
  // Disable the SDK's request deadline, not the independent shell deadline.
  fetch: (url, options) => fetch(url, { ...options, signal: null }),
  maxRetries: 0,
});

const models = await client.models.list();
const model = models.data.find(model => model.id === request.model);
if (!model || !('capabilities' in model) || typeof model.capabilities !== 'object'
  || model.capabilities === null || !('limits' in model.capabilities)
  || typeof model.capabilities.limits !== 'object' || model.capabilities.limits === null
  || !('max_output_tokens' in model.capabilities.limits)
  || typeof model.capabilities.limits.max_output_tokens !== 'number'
  || !Number.isSafeInteger(model.capabilities.limits.max_output_tokens)
  || model.capabilities.limits.max_output_tokens <= 0) {
  throw new Error('Copilot did not advertise a valid maximum output token limit.');
}
request.max_tokens = model.capabilities.limits.max_output_tokens;

function boundedText(bytes: Buffer, truncated: boolean): string {
  const text = new TextDecoder().decode(bytes.subarray(0, maxToolOutputBytes), { stream: truncated });
  return truncated ? `${text}\n[Tool output truncated at ${maxToolOutputBytes} bytes]` : text;
}

async function readText(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    if (!(await file.stat()).isFile()) throw new Error('read_file requires a regular text file.');
    const buffer = Buffer.alloc(maxToolOutputBytes + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    return boundedText(buffer.subarray(0, size), size > maxToolOutputBytes);
  } finally {
    await file.close();
  }
}

async function runShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(shell, shellArguments(command), {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    const chunks: Buffer[] = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;
    let groupStopped = false;
    function collect(chunk: Buffer): void {
      const remaining = maxToolOutputBytes - size;
      if (remaining > 0) chunks.push(Buffer.from(chunk.subarray(0, remaining)));
      size += Math.min(chunk.length, remaining);
      if (chunk.length > remaining) truncated = true;
    }
    function killGroup(): void {
      if (!child.pid || groupStopped) return;
      try {
        if (process.platform === 'win32') {
          if (timedOut) groupStopped = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']).status === 0;
        } else {
          process.kill(-child.pid, 'SIGKILL');
          groupStopped = true;
        }
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
          reject(new Error(`Could not stop shell process group ${child.pid} (exit ${child.exitCode}, signal ${child.signalCode}): ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup();
    }, commandTimeoutMs);
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    // Also stop background descendants that would otherwise survive the command.
    child.on('exit', killGroup);
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve(JSON.stringify({
        exitCode, signal, timedOut,
        output: boundedText(Buffer.concat(chunks), truncated),
      }));
    });
  });
}

// The current moment in a time zone, both readable and as ISO 8601 with the UTC offset.
function currentTime(timeZone: string): string {
  const now = new Date();
  const zone = timeZone === 'local' ? undefined : timeZone;
  const readable = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: zone });
  const numeric = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset',
  });
  const part = Object.fromEntries(numeric.formatToParts(now).map(({ type, value }) => [type, value]));
  const offset = part.timeZoneName === 'GMT' ? '+00:00' : part.timeZoneName.replace('GMT', '');
  return [
    readable.format(now),
    `ISO 8601: ${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}:${part.second}${offset}`,
    `Time zone: ${readable.resolvedOptions().timeZone}`,
  ].join('\n');
}

async function runTool(call: ChatCompletionMessageFunctionToolCall): Promise<string> {
  try {
    const args: unknown = JSON.parse(call.function.arguments);
    const keys = call.function.name === 'write_file' ? ['path', 'content']
      : call.function.name === 'read_file' ? ['path']
        : call.function.name === 'shell' ? ['command']
          : call.function.name === 'get_current_time' ? ['time_zone'] : [];
    if (!isStringArguments(args) || !keys.length
      || Object.keys(args).length !== keys.length
      || !keys.every(key => key in args)) {
      throw new Error(`Invalid arguments or unknown tool: ${call.function.name}`);
    }
    const targetKey = call.function.name === 'shell' ? 'command'
      : call.function.name === 'get_current_time' ? 'time_zone' : 'path';
    const target = args[targetKey];
    if (!target.trim()) throw new Error(`The ${targetKey} must not be empty.`);
    console.log(`[${call.function.name}] ${JSON.stringify(target).slice(0, 120)}`);
    if (call.function.name === 'shell') return await runShell(target);
    if (call.function.name === 'read_file') return await readText(target);
    if (call.function.name === 'get_current_time') return currentTime(target);
    if (call.function.name === 'write_file') {
      const content = args.content;
      await writeFile(target, content, 'utf8');
      return `Wrote ${Buffer.byteLength(content)} bytes to ${JSON.stringify(target).slice(0, 200)}.`;
    }
    throw new Error(`Unknown tool: ${call.function.name}`);
  } catch (error) {
    const bytes = Buffer.from(error instanceof Error ? error.message : String(error));
    const detail = boundedText(bytes, bytes.length > maxToolOutputBytes);
    console.error(`[${call.function.name}] Error: ${detail.slice(0, 200)}`);
    return JSON.stringify({ error: detail });
  }
}

function isStringArguments(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null
    && Object.values(value).every(value => typeof value === 'string');
}

// A reply that failed or stopped early. It isn't saved, so the conversation can carry on.
class ReplyError extends Error {}

function describeError(error: unknown): string {
  const parts: string[] = [];
  for (let cause = error; cause !== undefined && parts.length < 4;
    cause = cause instanceof Error ? cause.cause : undefined) {
    parts.push((cause instanceof Error ? cause.message : String(cause)).replace(/\.$/, ''));
  }
  return parts.join(': ');
}

type Section = 'reasoning' | 'content';

// Prints reasoning (dimmed) and words as they arrive, with a spinner until the first bit shows up.
function startDisplay(): { show(section: Section, text: string): void; end(): void } {
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  let frame = 0;
  let spinning = Boolean(process.stdout.isTTY);
  const spin = () => process.stdout.write(`\r\x1b[2m${frames[frame++ % frames.length]}\x1b[22m`);
  const timer = spinning ? setInterval(spin, 80) : undefined;
  if (spinning) spin();
  let current: Section | null = null;
  let heldSpace = '';
  function end(): void {
    if (spinning) {
      spinning = false;
      clearInterval(timer);
      process.stdout.write('\r\x1b[K');
    }
    if (current) process.stdout.write(current === 'reasoning' ? '\x1b[22m\n' : '\n');
    current = null;
    heldSpace = '';
  }
  function show(section: Section, text: string): void {
    if (section !== current) {
      text = text.trimStart();
      if (!text) return;
      end();
      current = section;
      process.stdout.write(section === 'reasoning' ? '\x1b[2m' : `${assistantName}: `);
    }
    // Hold back trailing whitespace, so each section prints trimmed.
    const pending = heldSpace + text;
    const visible = pending.trimEnd();
    heldSpace = pending.slice(visible.length);
    if (visible) process.stdout.write(visible);
  }
  return { show, end };
}

async function complete(): Promise<AssistantMessage> {
  await saveConversation();
  const message: AssistantMessage = { role: 'assistant', content: null };
  const toolFragments = new Map<number, ChatCompletionMessageFunctionToolCall>();
  let finishReason: string | null = null;
  const display = startDisplay();
  try {
    const stream = await client.chat.completions.create(request);
    for await (const chunk of stream) {
      const choice = chunk.choices.find(choice => choice.index === 0);
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      // Merge every field, including Copilot's readable and opaque reasoning.
      for (const [key, value] of Object.entries(choice.delta)) {
        if (key === 'tool_calls' || key === 'role' || value === null || value === undefined) continue;
        message[key] = typeof value === 'string'
          ? (typeof message[key] === 'string' ? message[key] : '') + value : value;
        if (typeof value === 'string' && key === 'reasoning_text') display.show('reasoning', value);
        if (typeof value === 'string' && key === 'content') display.show('content', value);
      }
      for (const part of choice.delta.tool_calls || []) {
        if (part.type && part.type !== 'function') throw new Error('Unsupported streamed tool type.');
        if (!Number.isSafeInteger(part.index) || part.index < 0) {
          throw new Error('Invalid streamed tool-call index.');
        }
        let call = toolFragments.get(part.index);
        if (!call) {
          call = { id: '', type: 'function', function: { name: '', arguments: '' } };
          toolFragments.set(part.index, call);
        }
        if (part.id) call.id += part.id;
        if (part.function?.name) call.function.name += part.function.name;
        if (part.function?.arguments) call.function.arguments += part.function.arguments;
      }
    }
  } catch (error) {
    throw new ReplyError(`Copilot API error: ${describeError(error)}`, { cause: error });
  } finally {
    display.end();
  }
  // Copilot indexes content blocks, so tool indexes can start above zero or have gaps.
  const calls = [...toolFragments.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
  if (calls.some(call => !call.id || !call.function.name)) {
    throw new ReplyError('Copilot sent an incomplete tool call.');
  }
  if (calls.length) message.tool_calls = calls;
  if (!((finishReason === 'stop' && typeof message.content === 'string' && message.content.trim())
    || (finishReason === 'tool_calls' && calls.length))) {
    throw new ReplyError(`Copilot stopped without a complete answer (finish reason: ${finishReason}).`);
  }
  request.messages.push(message);
  await saveConversation();
  if (typeof message.reasoning_text !== 'string' || !message.reasoning_text.trim()) {
    console.error('Copilot returned no readable reasoning.');
  }
  return message;
}

async function runPendingTools(): Promise<void> {
  const assistant = request.messages.findLast(message => message.role === 'assistant');
  if (assistant?.role !== 'assistant' || !assistant.tool_calls?.length) return;
  const index = request.messages.lastIndexOf(assistant);
  const completed = new Set(request.messages.slice(index + 1)
    .filter(message => message.role === 'tool').map(message => message.tool_call_id));
  for (const call of assistant.tool_calls) {
    if (completed.has(call.id)) continue;
    const content = call.type === 'function' ? await runTool(call)
      : JSON.stringify({ error: 'Unsupported tool type.' });
    request.messages.push({ role: 'tool', tool_call_id: call.id, content });
    await saveConversation();
  }
}

async function answer(): Promise<void> {
  try {
    await runPendingTools();
    for (let round = 0; round < maxRounds; round++) {
      const message = await complete();
      if (!message.tool_calls?.length) return;
      await runPendingTools();
    }
  } catch (error) {
    if (!(error instanceof ReplyError)) throw error;
    console.error(`\x1b[31m${error.message}\x1b[39m`);
    console.error('Nothing from that reply was saved. Send another message to keep going.');
    return;
  }
  throw new Error(`Stopped after ${maxRounds} model rounds. Conversation and tool results were saved.`);
}

const last = request.messages.at(-1);
if (last?.role === 'user' || last?.role === 'tool'
  || (last?.role === 'assistant' && last.tool_calls?.length)) {
  await answer();
}

const terminal = createInterface({ input: process.stdin, output: process.stdout, prompt: 'You: ' });
try {
  if (process.stdin.isTTY) terminal.prompt();
  for await (const line of terminal) {
    if (line.trim()) {
      request.messages.push({ role: 'user', content: line });
      await answer();
    }
    if (process.stdin.isTTY) terminal.prompt();
  }
} finally {
  terminal.close();
}
