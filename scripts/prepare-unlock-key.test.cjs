const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
const { prepareUnlockKey } = require('./prepare-unlock-key.cjs');

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cf-manager-unlock-test-'));
  t.after(() => rmSync(directory, { recursive: true }));
  const file = join(directory, 'env');
  const messages = [];
  return { file, messages, output: message => messages.push(message) };
}

test('missing key generates 256 random bits, prints once then masks, and exports the same value', t => {
  const { file, messages, output } = fixture(t);
  prepareUnlockKey({ GITHUB_ENV: file }, output);
  const exported = readFileSync(file, 'utf8');
  assert.match(exported, /^UNLOCK_KEY=[0-9a-f]{64}\n$/);
  const key = exported.trim().slice('UNLOCK_KEY='.length);
  assert.deepEqual(messages, [`Generated UNLOCK_KEY (save privately): ${key}`, `::add-mask::${key}`]);
});

test('configured key is preserved and only emitted as a masking command', t => {
  const { file, messages, output } = fixture(t);
  const key = randomBytes(32).toString('base64url');
  prepareUnlockKey({ GITHUB_ENV: file, UNLOCK_KEY: key }, output);
  assert.equal(readFileSync(file, 'utf8'), `UNLOCK_KEY=${key}\n`);
  assert.deepEqual(messages, [`::add-mask::${key}`]);
});

test('rejects environment-file injection and missing CI destination before output', t => {
  const { file, messages, output } = fixture(t);
  for (const key of ['value\nOTHER=value', 'value\rOTHER=value', 'value\0']) {
    assert.throws(() => prepareUnlockKey({ GITHUB_ENV: file, UNLOCK_KEY: key }, output));
  }
  assert.throws(() => prepareUnlockKey({}, output));
  assert.deepEqual(messages, []);
});
