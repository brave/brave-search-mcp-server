import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const seenPaths: string[] = [];

  const getClient = useTestClient((url) => {
    seenPaths.push(url.pathname);

    if (url.pathname === '/res/v1/web/search') {
      return {
        type: 'search',
        locations: {
          results: [{ id: 'poi-1', title: 'Brave Coffee Shop' }],
        },
      };
    }

    if (url.pathname === '/res/v1/local/pois') {
      return {
        type: 'local_pois',
        results: [
          {
            type: 'location_result',
            id: 'poi-1',
            title: 'Brave Coffee Shop',
            url: 'https://example.com/brave-coffee',
            is_source_local: true,
            is_source_both: false,
            family_friendly: true,
            provider_url: 'https://example.com/provider',
            zoom_level: 14,
            contact: { telephone: '+1-415-555-0100' },
            rating: { ratingValue: 4.6, reviewCount: 128 },
            postal_address: { displayAddress: '1 Market St, San Francisco, CA' },
            price_range: '$$',
          },
        ],
      };
    }

    if (url.pathname === '/res/v1/local/descriptions') {
      return {
        type: 'local_descriptions',
        results: [{ type: 'local_description', id: 'poi-1', description: 'A cozy coffee shop.' }],
      };
    }
  });

  it('returns enriched location results for a simple query', async () => {
    seenPaths.length = 0;

    const result = await getClient().callTool({
      name,
      arguments: { query: 'coffee shops in san francisco' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
    assert.ok(seenPaths.includes('/res/v1/local/pois'), 'should hit /local/pois');
    assert.ok(seenPaths.includes('/res/v1/local/descriptions'), 'should hit /local/descriptions');

    const text = (result.content as { text: string }[])[0].text;
    assert.match(text, /\+1-415-555-0100/);
    assert.match(text, /1 Market St/);
    assert.match(text, /A cozy coffee shop/);
  });
});

describe(`${name} (no locations, web fallback available)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return {
        type: 'search',
        web: {
          results: [
            {
              url: 'https://example.com/cafe',
              title: 'Local Cafe',
              description: 'A nice cafe.',
              extra_snippets: [],
            },
          ],
        },
      };
    }
  });

  it('falls back to formatted web results', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { query: 'coffee shops in san francisco' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));

    const content = result.content as { text: string }[];
    assert.equal(content.length, 2);
    assert.match(content[0].text, /Falling back to general web search/);
    assert.match(content[1].text, /Local Cafe/);
  });
});

describe(`${name} (no locations, no web results)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return { type: 'search' };
    }
  });

  it('reports that no location data was found', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { query: 'coffee shops in san francisco' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.deepEqual(result.content, [
      {
        type: 'text',
        text: "No location data was returned. User's plan does not support local search, or the query may be unclear.",
      },
    ]);
  });
});
