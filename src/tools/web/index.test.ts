import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return {
        type: 'search',
        web: {
          results: [
            {
              url: 'https://search.brave.com/',
              title: 'Brave Search',
              description: 'A privacy-focused search engine.',
              extra_snippets: [],
            },
          ],
        },
      };
    }
  });

  it('returns web results for a simple query', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
