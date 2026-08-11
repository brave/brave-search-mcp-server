import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
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

  it('returns grounding content for a simple query', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

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
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/llm/context') {
      // `sources` is required by the output schema; omitting it simulates
      // an upstream response that fails validation.
      return {
        grounding: { generic: [], map: [] },
      };
    }
  });

  it('surfaces the validation failure as an error result', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError, true);
    assert.ok(JSON.stringify(result.content).includes('sources'), JSON.stringify(result.content));
  });
});
