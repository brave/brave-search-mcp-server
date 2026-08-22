import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import config from '../config.js';
import { resetRateLimitState } from '../utils.js';
import API from './index.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  config.ready = false;
  config.minRequestIntervalMs = 1000;
  resetRateLimitState();
});

function jsonResponse(body: unknown, init: { status?: number; retryAfter?: string } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (init.retryAfter) {
    headers.set('retry-after', init.retryAfter);
  }
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.status === 429 ? 'Too Many Requests' : 'OK',
    headers,
  });
}

describe('issueRequest rate limiting', () => {
  it('spaces out parallel calls once the server is ready', async () => {
    const startedAt: number[] = [];
    config.ready = true;
    config.minRequestIntervalMs = 40;
    resetRateLimitState();

    globalThis.fetch = (async () => {
      startedAt.push(Date.now());
      return jsonResponse({ type: 'search', web: { results: [] } });
    }) as typeof fetch;

    await Promise.all([
      API.issueRequest('web', { q: 'one' } as never),
      API.issueRequest('web', { q: 'two' } as never),
      API.issueRequest('web', { q: 'three' } as never),
    ]);

    startedAt.sort((a, b) => a - b);
    assert.equal(startedAt.length, 3);
    assert.ok(startedAt[1] - startedAt[0] >= 30);
    assert.ok(startedAt[2] - startedAt[1] >= 30);
  });

  it('retries a 429 using Retry-After', async () => {
    let calls = 0;
    config.ready = true;
    config.minRequestIntervalMs = 0;
    resetRateLimitState();

    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ error: 'slow down' }, { status: 429, retryAfter: '0' });
      }
      return jsonResponse({ type: 'search', web: { results: [] } });
    }) as typeof fetch;

    const result = await API.issueRequest('web', { q: 'retry' } as never);
    assert.equal(calls, 2);
    assert.equal((result as { type: string }).type, 'search');
  });

  it('does not throttle when config is not ready (tests / unused client)', async () => {
    const startedAt: number[] = [];
    config.ready = false;
    config.minRequestIntervalMs = 1000;
    resetRateLimitState();

    globalThis.fetch = (async () => {
      startedAt.push(Date.now());
      return jsonResponse({ type: 'search', web: { results: [] } });
    }) as typeof fetch;

    await Promise.all([
      API.issueRequest('web', { q: 'a' } as never),
      API.issueRequest('web', { q: 'b' } as never),
    ]);

    startedAt.sort((a, b) => a - b);
    assert.ok(startedAt[1] - startedAt[0] < 200);
  });
});
