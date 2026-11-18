// The ourostack/.github commit that public/brand/storybook/ was synced from, recorded in brand-pin.json.
// The brand audit checks the site's copies against the brand at this commit, not at main, so an upstream
// brand change does not turn this repository red. scripts/sync-storybook.mjs writes the pin with the copies,
// and sync-brand.yml commits both in one pull request.
//
//   node scripts/brand-pin.mjs commit [--file <brand-pin.json>]   # prints the pinned commit, or fails with the fix
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPOSITORY = 'ourostack/.github';
export const PIN_FILE = fileURLToPath(new URL('../brand-pin.json', import.meta.url));
const SYNC_FIX = 'Fix: run node scripts/sync-storybook.mjs --from-github main, and commit brand-pin.json with public/brand/storybook/.';

export function parseBrandPin(text, file = 'brand-pin.json') {
  let pin;
  try {
    pin = JSON.parse(text);
  } catch (err) {
    throw new Error(`${file} is not JSON (${err.message}). ${SYNC_FIX}`);
  }
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) throw new Error(`${file} must hold one JSON object. ${SYNC_FIX}`);
  const keys = Object.keys(pin).sort().join(', ');
  if (keys !== 'commit, repository') throw new Error(`${file} must have exactly the keys repository and commit, not ${keys || 'none'}. ${SYNC_FIX}`);
  if (pin.repository !== REPOSITORY) throw new Error(`${file} names ${JSON.stringify(pin.repository)}, not ${REPOSITORY}. ${SYNC_FIX}`);
  if (typeof pin.commit !== 'string' || !/^[0-9a-f]{40}$/.test(pin.commit)) throw new Error(`${file} has commit ${JSON.stringify(pin.commit)}, not a full 40-character commit sha. ${SYNC_FIX}`);
  return pin;
}

export function readBrandPin(file = PIN_FILE) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`${file} is missing, so the brand audit has no brand to judge the site's copies against. ${SYNC_FIX}`);
    throw err;
  }
  return parseBrandPin(text, file);
}

export function writeBrandPin(file, commit) {
  writeFileSync(file, JSON.stringify({ repository: REPOSITORY, commit }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--file');
  const file = i >= 0 ? argv[i + 1] : PIN_FILE;
  if (argv[0] !== 'commit') {
    console.error('usage: node scripts/brand-pin.mjs commit [--file <brand-pin.json>]');
    process.exit(2);
  }
  try {
    console.log(readBrandPin(file).commit);
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}
