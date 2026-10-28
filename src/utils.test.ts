import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  isLoopbackHostname,
  parseIntervalMs,
  parsePort,
  parseRetryAfterMs,
  readBraveApiKeyFromFile,
  resetRateLimitState,
  waitForRateLimit,
} from './utils.js';

describe('parseIntervalMs', () => {
  it('accepts 0 and typical gaps', () => {
    assert.equal(parseIntervalMs(0), 0);
    assert.equal(parseIntervalMs('1000'), 1000);
    assert.equal(parseIntervalMs(250), 250);
  });

  it('rejects junk and values over a minute', () => {
    assert.equal(parseIntervalMs('nope'), null);
    assert.equal(parseIntervalMs(-1), null);
    assert.equal(parseIntervalMs(60001), null);
    assert.equal(parseIntervalMs(undefined), null);
  });
});

describe('parseRetryAfterMs', () => {
  it('parses delta-seconds', () => {
    assert.equal(parseRetryAfterMs('2', 1000), 2000);
    assert.equal(parseRetryAfterMs('0', 1000), 0);
  });

  it('falls back when the header is missing or garbage', () => {
    assert.equal(parseRetryAfterMs(null, 750), 750);
    assert.equal(parseRetryAfterMs('soon', 750), 750);
  });
});

describe('waitForRateLimit', () => {
  it('no-ops when interval is 0', async () => {
    resetRateLimitState();
    const start = Date.now();
    await Promise.all([waitForRateLimit(0), waitForRateLimit(0)]);
    assert.ok(Date.now() - start < 50);
  });
});

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

describe('isLoopbackHostname', () => {
  it('accepts localhost and the IPv6 loopback', () => {
    assert.equal(isLoopbackHostname('localhost'), true);
    assert.equal(isLoopbackHostname('::1'), true);
  });

  it('accepts addresses across the whole IPv4 127.0.0.0/8 range', () => {
    assert.equal(isLoopbackHostname('127.0.0.1'), true);
    assert.equal(isLoopbackHostname('127.0.0.0'), true);
    assert.equal(isLoopbackHostname('127.1.2.3'), true);
    assert.equal(isLoopbackHostname('127.255.255.255'), true);
    assert.equal(isLoopbackHostname('127.0.0.255'), true);
  });

  it('rejects non-loopback IPv4 addresses', () => {
    assert.equal(isLoopbackHostname('128.0.0.1'), false);
    assert.equal(isLoopbackHostname('126.255.255.255'), false);
    assert.equal(isLoopbackHostname('0.0.0.0'), false);
    assert.equal(isLoopbackHostname('192.168.0.1'), false);
    assert.equal(isLoopbackHostname('10.0.0.1'), false);
  });

  it('rejects IPv4 octets outside 0-255', () => {
    assert.equal(isLoopbackHostname('127.0.0.256'), false);
    assert.equal(isLoopbackHostname('127.0.0.999'), false);
  });

  it('rejects addresses without exactly four octets', () => {
    assert.equal(isLoopbackHostname('127'), false);
    assert.equal(isLoopbackHostname('127.0.0'), false);
    assert.equal(isLoopbackHostname('127.0.0.1.2'), false);
    assert.equal(isLoopbackHostname(''), false);
  });

  it('rejects non-numeric or malformed IPv4 octets', () => {
    assert.equal(isLoopbackHostname('127.0.0.x'), false);
    assert.equal(isLoopbackHostname('127.0.0.-1'), false);
    assert.equal(isLoopbackHostname('127.0.0.1abc'), false);
    assert.equal(isLoopbackHostname('127.0.0. 1'), false);
    assert.equal(isLoopbackHostname('0127.0.0.1'), false);
  });

  it('rejects non-loopback hostnames and non-normalized input', () => {
    assert.equal(isLoopbackHostname('example.com'), false);
    // Callers normalize (lowercase) before calling, so uppercase is not matched.
    assert.equal(isLoopbackHostname('LOCALHOST'), false);
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
