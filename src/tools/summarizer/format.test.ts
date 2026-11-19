import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatSummary } from './format.js';
import type { SummaryMessage } from './types.js';

// Parts below are trimmed from real Summarizer responses requested with entity_info=1.
describe('formatSummary', () => {
  it('keeps tokens and renders inline references as URLs', () => {
    const summary: SummaryMessage[] = [
      { type: 'token', data: 'Brave is a privacy-focused browser' },
      {
        type: 'inline_reference',
        data: {
          type: 'inline_reference',
          url: 'https://brave.com/',
          start_index: 0,
          end_index: 34,
          number: 1,
        },
      },
      { type: 'token', data: '.' },
    ];

    assert.equal(
      formatSummary(summary),
      'Brave is a privacy-focused browser (https://brave.com/).'
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
});
