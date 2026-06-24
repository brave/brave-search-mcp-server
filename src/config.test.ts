import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { getOptions } from './config.js';

const CONFIG_ENV_VARS = [
  'BRAVE_API_KEY',
  'BRAVE_API_KEY_FILE',
  'BRAVE_MCP_LOG_LEVEL',
  'BRAVE_MCP_TRANSPORT',
  'BRAVE_MCP_ENABLED_TOOLS',
  'BRAVE_MCP_DISABLED_TOOLS',
  'BRAVE_MCP_PORT',
  'BRAVE_MCP_HOST',
  'BRAVE_MCP_STATELESS',
] as const;

describe('getOptions', () => {
  const originalArgv = process.argv;
  const originalEnv = Object.fromEntries(CONFIG_ENV_VARS.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    for (const key of CONFIG_ENV_VARS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.argv = originalArgv;
    for (const key of CONFIG_ENV_VARS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
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
