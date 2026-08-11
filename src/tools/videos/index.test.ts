import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/videos/search') {
      return {
        results: [
          {
            url: 'https://example.com/video',
            title: 'Introducing Brave',
            description: 'A video about the Brave browser.',
            age: '1 day ago',
            video: {
              duration: '5:00',
              views: '1000',
              creator: 'Brave Software',
              publisher: 'Brave Software',
              tags: ['browser'],
            },
            thumbnail: { src: 'https://example.com/thumb.jpg' },
          },
        ],
      };
    }
  });

  it('returns video results for a simple query', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});
