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

  it('includes the HTTP status and raw body when the API returns a non-JSON error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('Bad Gateway', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'content-type': 'text/plain' },
      })) as typeof fetch;

    try {
      const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

      assert.equal(result.isError, true);
      assert.ok(Array.isArray(result.content) && result.content.length > 0);
      const firstContent = result.content[0];
      assert.equal(firstContent?.type, 'text');
      assert.match(firstContent.text, /502 Bad Gateway\nBad Gateway/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
