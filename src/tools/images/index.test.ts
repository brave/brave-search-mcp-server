import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/images/search') {
      return {
        type: 'images',
        query: { original: 'brave browser' },
        results: [
          {
            type: 'image_result',
            title: 'Brave Browser Logo',
            url: 'https://example.com/logo.png',
            page_fetched: '2024-01-01T00:00:00Z',
            confidence: 'high',
            properties: {
              url: 'https://example.com/logo-full.png',
              width: 512,
              height: 512,
            },
          },
        ],
        extra: { might_be_offensive: false },
      };
    }
  });

  it('returns image results for a simple query', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, {
      type: 'object',
      items: [
        {
          title: 'Brave Browser Logo',
          url: 'https://example.com/logo.png',
          page_fetched: '2024-01-01T00:00:00Z',
          confidence: 'high',
          properties: {
            url: 'https://example.com/logo-full.png',
            width: 512,
            height: 512,
          },
        },
      ],
      count: 1,
      might_be_offensive: false,
    });
  });
});

describe(`${name} (malformed upstream response)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/images/search') {
      return {
        type: 'images',
        query: { original: 'brave browser' },
        results: [],
        // `might_be_offensive` is required by the output schema; omitting it
        // simulates an upstream response that fails validation.
        extra: {},
      };
    }
  });

  it('surfaces the validation failure as an error result', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError, true);
    assert.ok(
      JSON.stringify(result.content).includes('might_be_offensive'),
      JSON.stringify(result.content)
    );
  });
});
