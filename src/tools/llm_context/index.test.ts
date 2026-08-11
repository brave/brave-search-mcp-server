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
      if (url.pathname === '/res/v1/llm/context') {
        return {
          grounding: {
            generic: [
              {
                url: 'https://search.brave.com/',
                title: 'Brave Search',
                snippets: ['Brave is a privacy-focused browser and search engine.'],
              },
            ],
            map: [],
          },
          sources: {
            'https://search.brave.com/': { title: 'Brave Search' },
          },
        };
      }
    });

    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  it('returns grounding content for a simple query', async () => {
    const result = await client.callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
