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
