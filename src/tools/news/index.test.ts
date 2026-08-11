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
      if (url.pathname === '/res/v1/news/search') {
        return {
          results: [
            {
              url: 'https://example.com/news',
              title: 'Brave ships a new release',
              description: 'News about Brave.',
              age: '1 hour ago',
              page_age: '2024-01-01T00:00:00Z',
              breaking: false,
              is_live: false,
              extra_snippets: [],
              thumbnail: { src: 'https://example.com/news-thumb.jpg' },
            },
          ],
        };
      }
    });

    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  it('returns news results for a simple query', async () => {
    const result = await client.callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
