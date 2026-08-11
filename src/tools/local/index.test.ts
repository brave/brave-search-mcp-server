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
      if (url.pathname === '/res/v1/web/search') {
        return {
          type: 'search',
          locations: {
            results: [{ id: 'poi-1', title: 'Brave Coffee Shop' }],
          },
        };
      }

      if (url.pathname === '/res/v1/local/descriptions') {
        return {
          type: 'local_descriptions',
          results: [{ type: 'local_description', id: 'poi-1', description: 'A cozy coffee shop.' }],
        };
      }
    });

    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  it('returns enriched location results for a simple query', async () => {
    const result = await client.callTool({
      name,
      arguments: { query: 'coffee shops in san francisco' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
