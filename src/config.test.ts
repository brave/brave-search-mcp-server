import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { getOptions } from './config.js';

describe('getOptions', () => {
  const originalArgv = process.argv;
  const originalBraveApiKey = process.env.BRAVE_API_KEY;

  beforeEach(() => {
    delete process.env.BRAVE_API_KEY;
  });

  afterEach(() => {
    process.argv = originalArgv;
    if (originalBraveApiKey === undefined) {
      delete process.env.BRAVE_API_KEY;
    } else {
      process.env.BRAVE_API_KEY = originalBraveApiKey;
    }
  });

  it('rejects whitespace-only API keys', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', '   '];

    assert.equal(getOptions(), false);
  });

  it('reads API key from --brave-api-key-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brave-api-key-'));
    const filePath = join(dir, 'key.txt');
    writeFileSync(filePath, 'from-file\n');

    process.argv = ['node', 'index.js', '--brave-api-key-file', filePath];
    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.equal(options.braveApiKey, 'from-file');
    }
  });

  it('prefers file key over --brave-api-key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brave-api-key-'));
    const filePath = join(dir, 'key.txt');
    writeFileSync(filePath, 'from-file\n');

    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'from-env',
      '--brave-api-key-file',
      filePath,
    ];
    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.equal(options.braveApiKey, 'from-file');
    }
  });
});
