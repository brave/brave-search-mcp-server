import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
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

  it('returns news results for a simple query', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
