import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/summarizer/search') {
      return {
        type: 'summarizer',
        status: 'complete',
        summary: [{ type: 'token', data: 'Brave is a privacy-focused browser.' }],
      };
    }
  });

  it('returns a summary for a completed key', async () => {
    const result = await getClient().callTool({ name, arguments: { key: 'test-key' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});

describe(`${name} (pending summary)`, () => {
  const PENDING_RESPONSES = 2;
  const POLL_INTERVAL_MS = 50;
  let requestCount = 0;

  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/summarizer/search') {
      requestCount++;

      // The API answers 200 with a non-'complete' status while the summary is
      // still being generated.
      if (requestCount <= PENDING_RESPONSES) {
        return { type: 'summarizer', status: 'processing' };
      }

      return {
        type: 'summarizer',
        status: 'complete',
        summary: [{ type: 'token', data: 'Brave is a privacy-focused browser.' }],
      };
    }
  });

  it('backs off between polls instead of spinning on a pending status', async () => {
    const startedAt = Date.now();
    const result = await getClient().callTool({ name, arguments: { key: 'test-key' } });
    const elapsed = Date.now() - startedAt;

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.equal(requestCount, PENDING_RESPONSES + 1);

    // Without a wait between attempts the pending responses are burned through
    // back-to-back, hammering the API and finishing in ~0ms.
    assert.ok(
      elapsed >= PENDING_RESPONSES * POLL_INTERVAL_MS * 0.9,
      `expected to wait between polls, finished in ${elapsed}ms`
    );
  });
});
