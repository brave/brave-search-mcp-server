import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { connectTestClient, stubFetch } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  let client: Client;
  let close: () => Promise<void>;
  let restoreFetch: () => void;

  before(async () => {
    restoreFetch = stubFetch((url) => {
      if (url.pathname === '/res/v1/local/place_search') {
        return { type: 'locations' };
      }
    });

    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  it('returns a locations response for a simple location query', async () => {
    const result = await client.callTool({
      name,
      arguments: { location: 'san francisco ca united states' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
