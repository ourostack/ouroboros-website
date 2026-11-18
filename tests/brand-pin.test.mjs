import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PIN_FILE, parseBrandPin, readBrandPin, writeBrandPin } from '../scripts/brand-pin.mjs';

const root = new URL('..', import.meta.url).pathname;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const COMMIT = '27b8d74362538462cceb72de2fa3fd60f20d9e71';
const scratch = path.join(root, 'node_modules', '.cache', 'brand-pin-test');
fs.mkdirSync(scratch, { recursive: true });

test('the committed brand-pin.json names the ourostack/.github commit the served copies came from', () => {
  assert.equal(readBrandPin().commit, COMMIT);
  assert.equal(PIN_FILE, path.join(root, 'brand-pin.json'));
});

test('a missing pin fails with the fix: the sync that writes it', () => {
  const missing = path.join(scratch, 'no-such-pin.json');
  assert.throws(() => readBrandPin(missing), (err) => {
    assert.match(err.message, /missing, so the brand audit has no brand/);
    assert.match(err.message, /Fix: run node scripts\/sync-storybook\.mjs --from-github main/);
    return true;
  });
});

test('a malformed pin fails with the fix, whatever is wrong with it', () => {
  const fix = /Fix: run node scripts\/sync-storybook\.mjs --from-github main/;
  assert.throws(() => parseBrandPin('{ not json', 'brand-pin.json'), (err) => /is not JSON/.test(err.message) && fix.test(err.message));
  assert.throws(() => parseBrandPin('[]', 'brand-pin.json'), (err) => /must hold one JSON object/.test(err.message) && fix.test(err.message));
  assert.throws(() => parseBrandPin(JSON.stringify({ repository: 'ourostack/.github', commit: COMMIT, note: 'x' })), (err) => /exactly the keys repository and commit, not commit, note, repository/.test(err.message) && fix.test(err.message));
  assert.throws(() => parseBrandPin(JSON.stringify({ repository: 'ourostack/ouro-ui', commit: COMMIT })), (err) => /names "ourostack\/ouro-ui", not ourostack\/.github/.test(err.message) && fix.test(err.message));
  assert.throws(() => parseBrandPin(JSON.stringify({ repository: 'ourostack/.github', commit: 'main' })), (err) => /not a full 40-character commit sha/.test(err.message) && fix.test(err.message));
});

test('writeBrandPin records the repository and the commit, and the reader reads them back', () => {
  const file = path.join(scratch, 'pin.json');
  writeBrandPin(file, COMMIT);
  assert.equal(fs.readFileSync(file, 'utf8'), `{\n  "repository": "ourostack/.github",\n  "commit": "${COMMIT}"\n}\n`);
  assert.equal(readBrandPin(file).commit, COMMIT);
});

test('site-checks reads the pin, then checks out ourostack/.github at that commit, before npm test', () => {
  const wf = read('.github/workflows/site-checks.yml');
  const readPin = wf.indexOf('node scripts/brand-pin.mjs commit');
  const checkout = wf.indexOf('ref: ${{ steps.pin.outputs.commit }}');
  const npmTest = wf.indexOf('npm test 2>&1');
  assert.ok(readPin > 0 && readPin < checkout && checkout < npmTest, 'the pin is read and the audit checked out before the tests run');
  assert.doesNotMatch(wf, /ref: main/, 'no step checks ourostack/.github out at main');
  assert.match(wf, /BRAND_DOTGITHUB: \$\{\{ github\.workspace \}\}\/\.brand-dotgithub/);
});
