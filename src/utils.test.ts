import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parsePort, readBraveApiKeyFromFile } from './utils.js';

describe('parsePort', () => {
  it('accepts valid integer ports', () => {
    assert.equal(parsePort(8080), 8080);
    assert.equal(parsePort('8080'), 8080);
    assert.equal(parsePort(1), 1);
    assert.equal(parsePort(65535), 65535);
  });

  it('rejects non-numeric and out-of-range values', () => {
    assert.equal(parsePort('abc'), null);
    assert.equal(parsePort('8080abc'), null);
    assert.equal(parsePort('8080.5'), null);
    assert.equal(parsePort(0), null);
    assert.equal(parsePort(65536), null);
    assert.equal(parsePort(-1), null);
    assert.equal(parsePort(''), null);
    assert.equal(parsePort(null), null);
    assert.equal(parsePort(undefined), null);
  });
});

describe('readBraveApiKeyFromFile', () => {
  it('reads and trims API keys from a file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brave-api-key-'));
    const filePath = join(dir, 'key.txt');
    writeFileSync(filePath, 'test-api-key\n');

    const result = readBraveApiKeyFromFile(filePath);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.key, 'test-api-key');
    }
  });

  it('rejects empty files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brave-api-key-'));
    const filePath = join(dir, 'empty.txt');
    writeFileSync(filePath, '\n');

    const result = readBraveApiKeyFromFile(filePath);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /empty/i);
    }
  });

  it('reports missing files with the path and reason', () => {
    const result = readBraveApiKeyFromFile('definitely-not-a-real-api-key-file');

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /definitely-not-a-real-api-key-file/);
    }
  });
});
