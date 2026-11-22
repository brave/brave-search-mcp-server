import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { description, name } from './index.js';

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/summarizer/search') {
      return {
        type: 'summarizer',
        status: 'complete',
        summary: [
          { type: 'token', data: 'Brave makes a privacy-focused browser and search engine:' },
          { type: 'enum_start', data: 'ul' },
          {
            type: 'enum_item',
            data: { uuid: '1', name: 'Brave Browser', url: 'https://brave.com/' },
          },
          {
            type: 'enum_item',
            data: { uuid: '2', name: 'Brave Search', url: 'https://search.brave.com/' },
          },
          { type: 'enum_end' },
          { type: 'token', data: 'Both are free.' },
        ],
      };
    }
  });

  it('returns the summary text, including its entity lists', async () => {
    const result = await getClient().callTool({ name, arguments: { key: 'test-key' } });
    const content = result.content as Array<{ type: string; text: string }>;

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.equal(
      content[0]?.text,
      [
        'Brave makes a privacy-focused browser and search engine:',
        '',
        '- [Brave Browser](https://brave.com/)',
        '- [Brave Search](https://search.brave.com/)',
        '',
        'Both are free.',
      ].join('\n')
    );
  });

  it('describes itself as deprecated in favor of brave_answers', () => {
    assert.match(description, /^DEPRECATED:/);
    assert.match(description, /brave_answers/);
  });
});
