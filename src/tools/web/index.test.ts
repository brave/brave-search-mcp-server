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

describe(`${name} (no web results)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return { type: 'search', web: { results: [] } };
    }
  });

  it('reports that no web results were found', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /No web results found/);
  });
});

describe(`${name} (all result sections)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return {
        type: 'search',
        summarizer: { type: 'summarizer', key: 'summary-key-1' },
        web: {
          results: [
            { url: 'https://web.example/', title: 'Web hit', description: 'w', extra_snippets: [] },
          ],
        },
        faq: {
          results: [
            {
              question: 'Is Brave private?',
              answer: 'Yes.',
              title: 'FAQ hit',
              url: 'https://faq.example/',
            },
          ],
        },
        discussions: {
          mutated_by_goggles: false,
          results: [{ url: 'https://forum.example/', data: { title: 'Discussion hit' } }],
        },
        news: {
          mutated_by_goggles: false,
          results: [
            {
              url: 'https://news.example/',
              title: 'News hit',
              description: 'n',
              age: '1 hour ago',
              breaking: true,
              is_live: false,
              source: 'Example News',
              extra_snippets: [],
            },
          ],
        },
        videos: {
          mutated_by_goggles: false,
          results: [
            {
              url: 'https://video.example/',
              title: 'Video hit',
              description: 'v',
              age: '2 days ago',
              thumbnail: { src: 'https://video.example/thumb.jpg' },
              video: { duration: '10:00', views: 42, creator: 'Someone', publisher: 'Somewhere' },
            },
          ],
        },
      };
    }
  });

  it('includes every populated section and the summarizer key', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });
    const text = JSON.stringify(result.content);

    assert.equal(result.isError ?? false, false, text);

    for (const marker of ['Web hit', 'FAQ hit', 'Discussion hit', 'News hit', 'Video hit']) {
      assert.ok(text.includes(marker), `${marker} missing from ${text}`);
    }

    assert.match(text, /Summarizer key: summary-key-1/);
  });
});

describe(`${name} (sections present but empty)`, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/web/search') {
      return {
        type: 'search',
        web: {
          results: [
            { url: 'https://web.example/', title: 'Web hit', description: 'w', extra_snippets: [] },
          ],
        },
        // Present but empty sections must contribute nothing.
        faq: { results: [] },
        discussions: { mutated_by_goggles: false, results: [] },
        news: { mutated_by_goggles: false, results: [] },
        videos: { mutated_by_goggles: false, results: [] },
      };
    }
  });

  it('emits one entry per result and nothing for empty sections', async () => {
    const result = await getClient().callTool({ name, arguments: { query: 'brave browser' } });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.ok(Array.isArray(result.content));
    assert.equal(result.content.length, 1);
  });
});
