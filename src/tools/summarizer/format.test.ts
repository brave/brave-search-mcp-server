import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatSummary } from './format.js';
import type { SummaryMessage } from './types.js';

// Test data is shortened from real Summarizer responses, except in the minus
// sign and parentheses tests. The ordered-list test also removes the line
// breaks before its list, to check that they are added.

/** An inline reference; the formatter does not use its text positions. */
const reference = (url: string, number: number): SummaryMessage => ({
  type: 'inline_reference',
  data: { type: 'inline_reference', url, number, start_index: 0, end_index: 0 },
});

describe('formatSummary', () => {
  it('renders inline references as footnotes, one per source', () => {
    const civitatis = 'https://www.civitatis.com/blog/en/tallest-buildings-in-the-world/';
    const britannica =
      'https://www.britannica.com/technology/tallest-buildings-in-the-world-2226971';
    const visualCapitalist =
      'https://www.visualcapitalist.com/ranked-the-worlds-tallest-buildings/';
    const cntraveler = 'https://www.cntraveler.com/story/the-tallest-buildings-in-the-world';

    const summary: SummaryMessage[] = [
      { type: 'token', data: "The Burj Khalifa remains the world's tallest building" },
      reference(civitatis, 1),
      reference(britannica, 2),
      reference(visualCapitalist, 3),
      { type: 'token', data: '. It is followed closely by Merdeka 118' },
      reference(visualCapitalist, 3),
      reference(cntraveler, 4),
      { type: 'token', data: '.' },
    ];

    assert.equal(
      formatSummary(summary),
      [
        "The Burj Khalifa remains the world's tallest building[^1][^2][^3]. It is followed closely by Merdeka 118[^3][^4].",
        '',
        `[^1]: [civitatis.com](${civitatis})`,
        `[^2]: [britannica.com](${britannica})`,
        `[^3]: [visualcapitalist.com](${visualCapitalist})`,
        `[^4]: [cntraveler.com](${cntraveler})`,
      ].join('\n')
    );
  });

  it('renders an entity list set apart from the text that follows it', () => {
    const summary: SummaryMessage[] = [
      { type: 'token', data: 'The core discography consists of 13 UK studio albums' },
      { type: 'token', data: ':\n\n' },
      { type: 'enum_start', data: 'ul' },
      {
        type: 'enum_item',
        data: {
          uuid: '1eac89cec2ef4ba8bc4e31952c6324c1',
          name: 'Please Please Me',
          url: 'https://en.wikipedia.org/wiki/Please_Please_Me',
          text: 'Released March 22, 1963, this was their debut studio album.',
        },
      },
      {
        type: 'enum_item',
        data: {
          uuid: '9e5679cb92be4bea91750774bb0cae28',
          name: 'Revolver (Beatles album)',
          url: 'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)',
          text: 'Released August 5, 1966, it introduced new recording techniques and styles.',
        },
      },
      { type: 'enum_end' },
      { type: 'token', data: '**US-Specific Albums**\nCapitol Records released many albums' },
      { type: 'token', data: '.' },
    ];

    assert.equal(
      formatSummary(summary),
      [
        'The core discography consists of 13 UK studio albums:',
        '',
        '- [Please Please Me](https://en.wikipedia.org/wiki/Please_Please_Me) – Released March 22, 1963, this was their debut studio album.',
        '- [Revolver (Beatles album)](https://en.wikipedia.org/wiki/Revolver_(Beatles_album)) – Released August 5, 1966, it introduced new recording techniques and styles.',
        '',
        '**US-Specific Albums**',
        'Capitol Records released many albums.',
      ].join('\n')
    );
  });

  it('numbers an ordered list without repeating a description separator', () => {
    const summary: SummaryMessage[] = [
      { type: 'token', data: 'The tallest buildings in the world are:' },
      { type: 'enum_start', data: 'ol' },
      {
        type: 'enum_item',
        data: {
          uuid: 'a',
          name: 'Burj Khalifa (Dubai, UAE)',
          url: 'https://en.wikipedia.org/wiki/Burj_Khalifa',
          text: '– 828 m (2,717 ft)',
        },
      },
      {
        type: 'enum_item',
        data: { uuid: 'b', name: 'Merdeka 118', url: 'https://en.wikipedia.org/wiki/Merdeka_118' },
      },
      {
        type: 'enum_item',
        data: { uuid: 'c', name: 'Makkah Royal Clock Tower (Mecca, Saudi Arabia)' },
      },
      { type: 'enum_end' },
      { type: 'token', data: 'These rankings are based on official architectural height.' },
    ];

    assert.equal(
      formatSummary(summary),
      [
        'The tallest buildings in the world are:',
        '',
        '1. [Burj Khalifa (Dubai, UAE)](https://en.wikipedia.org/wiki/Burj_Khalifa) – 828 m (2,717 ft)',
        '2. [Merdeka 118](https://en.wikipedia.org/wiki/Merdeka_118)',
        '3. Makkah Royal Clock Tower (Mecca, Saudi Arabia)',
        '',
        'These rankings are based on official architectural height.',
      ].join('\n')
    );
  });

  it('keeps a minus sign that begins a description', () => {
    const summary: SummaryMessage[] = [
      { type: 'enum_start', data: 'ul' },
      { type: 'enum_item', data: { uuid: 'a', name: 'Vostok Station', text: '-89.2 °C' } },
      { type: 'enum_item', data: { uuid: 'b', name: 'Oymyakon', text: '– -67.7 °C' } },
      { type: 'enum_end' },
    ];

    assert.equal(formatSummary(summary), '- Vostok Station – -89.2 °C\n- Oymyakon – -67.7 °C');
  });

  it('percent-encodes unmatched parentheses in link URLs', () => {
    const summary: SummaryMessage[] = [
      { type: 'token', data: 'Sources' },
      reference('https://example.com/a(b', 1),
      { type: 'enum_start', data: 'ul' },
      {
        type: 'enum_item',
        data: { uuid: 'a', name: 'Unmatched', url: 'https://example.com/a)b' },
      },
      {
        type: 'enum_item',
        data: { uuid: 'b', name: 'Matched', url: 'https://example.com/(a)b' },
      },
      { type: 'enum_end' },
    ];

    assert.equal(
      formatSummary(summary),
      [
        'Sources[^1]',
        '',
        '- [Unmatched](https://example.com/a%29b)',
        '- [Matched](https://example.com/(a)b)',
        '',
        '[^1]: [example.com](https://example.com/a%28b)',
      ].join('\n')
    );
  });
});
