import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/local/place_search') {
      return { type: 'locations' };
    }
  });

  it('returns a locations response for a simple location query', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { location: 'san francisco ca united states' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, { type: 'locations' });
  });
});
