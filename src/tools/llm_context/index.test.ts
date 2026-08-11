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
    assert.deepEqual(result.structuredContent, {
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
    });
  });
});

describe(`${name} (malformed upstream response)`, () => {
  let client: Client;
  let close: () => Promise<void>;
  let restoreFetch: () => void;

  before(async () => {
    restoreFetch = stubFetch((url) => {
      if (url.pathname === '/res/v1/llm/context') {
        // `sources` is required by the output schema; omitting it simulates
        // an upstream response that fails validation.
        return {
          grounding: { generic: [], map: [] },
        };
      }
    });

    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  it('surfaces the validation failure as an error result', async () => {
    const result = await client.callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError, true);
    assert.ok(JSON.stringify(result.content).includes('sources'), JSON.stringify(result.content));
  });
});
