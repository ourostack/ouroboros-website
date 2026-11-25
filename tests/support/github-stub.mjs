// Loaded with `node --import` into a child process that runs the brand audit. Nothing that is not this
// machine gets through: a GitHub request is logged to STUB_GITHUB_LOG (one URL a line) and answered 404,
// so the audit's own failure paths run and no test reaches the network. tests/brand-audit.test.mjs reads the log.
import fs from 'node:fs';

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : (input.url ?? input.href));
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return realFetch(input, init);
  if (process.env.STUB_GITHUB_LOG) fs.appendFileSync(process.env.STUB_GITHUB_LOG, `${url.href}\n`);
  return new Response(JSON.stringify({ message: 'stubbed by tests/support/github-stub.mjs' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
};
