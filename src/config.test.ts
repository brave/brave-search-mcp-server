import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import config, { getOptions, isToolPermittedByUser } from './config.js';

const CONFIG_ENV_VARS = [
  'BRAVE_API_KEY',
  'BRAVE_API_KEY_FILE',
  'BRAVE_MCP_LOG_LEVEL',
  'BRAVE_MCP_TRANSPORT',
  'BRAVE_MCP_ENABLED_TOOLS',
  'BRAVE_MCP_DISABLED_TOOLS',
  'BRAVE_MCP_PORT',
  'BRAVE_MCP_HOST',
  'BRAVE_MCP_ALLOWED_ORIGINS',
  'BRAVE_MCP_ALLOWED_HOSTS',
  'BRAVE_MCP_STATELESS',
] as const;

describe('getOptions', () => {
  const originalArgv = process.argv;
  const originalEnv = Object.fromEntries(CONFIG_ENV_VARS.map((key) => [key, process.env[key]]));
  const originalConsoleError = console.error;

  beforeEach(() => {
    for (const key of CONFIG_ENV_VARS) {
      delete process.env[key];
    }
    // getOptions() logs validation failures via console.error; silence it so the
    // expected-failure cases don't add noise to the test output.
    console.error = () => {};
  });

  afterEach(() => {
    process.argv = originalArgv;
    console.error = originalConsoleError;
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

  it('defaults host to loopback (127.0.0.1)', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key', '--transport', 'http'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.equal(options.host, '127.0.0.1');
    }
  });

  it('honors BRAVE_MCP_HOST override', () => {
    process.env.BRAVE_MCP_HOST = '0.0.0.0';
    process.argv = ['node', 'index.js', '--brave-api-key', 'key', '--transport', 'http'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.equal(options.host, '0.0.0.0');
    }
  });

  it('defaults allowedOrigins to an empty list', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedOrigins, []);
    }
  });

  it('parses BRAVE_MCP_ALLOWED_ORIGINS (comma/space separated)', () => {
    process.env.BRAVE_MCP_ALLOWED_ORIGINS =
      'https://a.example, https://b.example https://c.example';
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedOrigins, [
        'https://a.example',
        'https://b.example',
        'https://c.example',
      ]);
    }
  });

  it('parses --allowed-origins from the CLI', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--allowed-origins',
      'https://a.example',
      'https://b.example',
    ];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedOrigins, ['https://a.example', 'https://b.example']);
    }
  });

  it('defaults allowedHosts to an empty list', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedHosts, []);
    }
  });

  it('parses BRAVE_MCP_ALLOWED_HOSTS (comma/space separated)', () => {
    process.env.BRAVE_MCP_ALLOWED_HOSTS = 'a.example:8080, b.example c.example';
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedHosts, ['a.example:8080', 'b.example', 'c.example']);
    }
  });

  it('parses --allowed-hosts from the CLI', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--allowed-hosts',
      'a.example',
      'b.example',
    ];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.allowedHosts, ['a.example', 'b.example']);
    }
  });
  it('parses space-separated --enabled-tools', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--enabled-tools',
      'brave_web_search',
      'brave_news_search',
    ];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.enabledTools, ['brave_web_search', 'brave_news_search']);
    }
  });

  it('parses comma-separated tool lists', () => {
    process.env.BRAVE_MCP_DISABLED_TOOLS = 'brave_summarizer,brave_llm_context';
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.deepEqual(options.disabledTools, ['brave_summarizer', 'brave_llm_context']);
    }
  });

  it('rejects --enabled-tools and --disabled-tools together', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--enabled-tools',
      'brave_web_search',
      '--disabled-tools',
      'brave_news_search',
    ];

    assert.equal(getOptions(), false);
  });

  it('rejects unknown tool names', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--enabled-tools',
      'brave_web_search',
      'brave_nonexistent',
    ];

    assert.equal(getOptions(), false);
  });

  it('rejects an invalid --transport', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key', '--transport', 'carrier-pigeon'];

    assert.equal(getOptions(), false);
  });

  it('rejects an invalid --logging-level', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key', '--logging-level', 'chatty'];

    assert.equal(getOptions(), false);
  });

  it('rejects an out-of-range --port for the http transport', () => {
    process.argv = [
      'node',
      'index.js',
      '--brave-api-key',
      'key',
      '--transport',
      'http',
      '--port',
      '99999',
    ];

    assert.equal(getOptions(), false);
  });

  it('yields a numeric port even under the stdio transport', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', 'key'];

    const options = getOptions();

    assert.notEqual(options, false);
    if (options) {
      assert.equal(typeof options.port, 'number');
      assert.equal(typeof config.port, 'number');
    }
  });
});

describe('isToolPermittedByUser', () => {
  const original = { enabled: config.enabledTools, disabled: config.disabledTools };

  afterEach(() => {
    config.enabledTools = original.enabled;
    config.disabledTools = original.disabled;
  });

  it('permits every tool when neither list is set', () => {
    config.enabledTools = [];
    config.disabledTools = [];

    assert.equal(isToolPermittedByUser('brave_web_search'), true);
    assert.equal(isToolPermittedByUser('brave_summarizer'), true);
  });

  it('permits only the enabled list when one is set', () => {
    config.enabledTools = ['brave_web_search'];
    config.disabledTools = [];

    assert.equal(isToolPermittedByUser('brave_web_search'), true);
    assert.equal(isToolPermittedByUser('brave_news_search'), false);
  });

  it('permits everything but the disabled list', () => {
    config.enabledTools = [];
    config.disabledTools = ['brave_summarizer'];

    assert.equal(isToolPermittedByUser('brave_summarizer'), false);
    assert.equal(isToolPermittedByUser('brave_web_search'), true);
  });

  it('lets the enabled list win if both are somehow set', () => {
    config.enabledTools = ['brave_web_search'];
    config.disabledTools = ['brave_web_search'];

    assert.equal(isToolPermittedByUser('brave_web_search'), true);
  });
});
