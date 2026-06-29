import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractResearchAnswer,
  formatAnswersContent,
  INCOMPLETE_RESEARCH_MESSAGE,
  replaceCitationBlocks,
  replaceEnumItemBlocks,
  stripUsageBlocks,
} from './format.js';

describe('extractResearchAnswer', () => {
  it('parses the JSON answer field from research mode tags', () => {
    const raw =
      '<queries>{"queries":["test"]}</queries>' +
      '<answer>{"answer": "Tokyo is the capital of Japan."}</answer>' +
      '<usage>{"X-Request-Total-Cost": 0.0}</usage>';

    assert.equal(extractResearchAnswer(raw), 'Tokyo is the capital of Japan.');
  });

  it('returns null when no answer tag is present', () => {
    const raw = '<queries>{"queries":["test"]}</queries><thinking>{"urls_selected":[]}</thinking>';

    assert.equal(extractResearchAnswer(raw), null);
  });

  it('returns the answer text when it is not a JSON object', () => {
    const raw = '<answer>Final answer.</answer>';

    assert.equal(extractResearchAnswer(raw), 'Final answer.');
  });

  it('returns the inner JSON when it lacks the answer field', () => {
    const raw = '<answer>{"urls_selected":[]}</answer>';

    assert.equal(extractResearchAnswer(raw), '{"urls_selected":[]}');
  });
});

describe('formatAnswersContent', () => {
  it('returns synthesized research prose only', () => {
    const result = formatAnswersContent(
      '<thinking>{"urls_selected":[]}</thinking><answer>{"answer":"Final answer."}</answer>',
      { enable_research: true }
    );

    assert.deepEqual(result, { ok: true, text: 'Final answer.' });
  });

  it('flags incomplete research responses', () => {
    const result = formatAnswersContent(
      '<thinking>{"urls_selected":["https://example.com"]}</thinking><progress>{"number_of_iterations":2}</progress>',
      { enable_research: true }
    );

    assert.deepEqual(result, { ok: false, reason: 'incomplete_research' });
  });

  it('strips usage metadata from streamed single-search output', () => {
    const result = formatAnswersContent('Hello world<usage>{"X-Request-Total-Cost":0}</usage>', {});

    assert.deepEqual(result, { ok: true, text: 'Hello world' });
  });

  it('converts citation blocks to markdown footnotes when citations are enabled', () => {
    const result = formatAnswersContent(
      'Answer text<citation>{"number":1,"url":"https://example.com","snippet":"A source."}</citation>',
      { enable_citations: true }
    );

    assert.deepEqual(result, {
      ok: true,
      text: 'Answer text[^1]\n\n[^1]: [example.com](https://example.com) — A source.',
    });
  });

  it('leaves citation blocks unchanged when citations are not enabled', () => {
    const raw = 'Answer text<citation>{"number":1,"url":"https://example.com"}</citation>';
    const result = formatAnswersContent(raw, {});

    assert.deepEqual(result, { ok: true, text: raw });
  });

  it('converts enum_item blocks to markdown bullets when entities are enabled', () => {
    const result = formatAnswersContent(
      'Albums:<enum_start>ul</enum_start><enum_item>{"original_tokens":"The Fame","href":"https://example.com/fame"}</enum_item><enum_end></enum_end><usage>{}</usage>',
      { enable_entities: true }
    );

    assert.deepEqual(result, {
      ok: true,
      text: 'Albums:\n* [The Fame](https://example.com/fame)',
    });
  });

  it('formats multiple enum_item blocks as a markdown list', () => {
    const result = formatAnswersContent(
      'Albums:<enum_item>{"original_tokens":"The Fame"}</enum_item><enum_item>{"original_tokens":"Chromatica"}</enum_item>',
      { enable_entities: true }
    );

    assert.deepEqual(result, {
      ok: true,
      text: 'Albums:\n* The Fame\n* Chromatica',
    });
  });

  it('falls back to name when original_tokens is missing', () => {
    const result = formatAnswersContent('<enum_item>{"name":"Chromatica"}</enum_item>', {
      enable_entities: true,
    });

    assert.deepEqual(result, { ok: true, text: '* Chromatica' });
  });
});

describe('INCOMPLETE_RESEARCH_MESSAGE', () => {
  it('is a non-empty user-facing message', () => {
    assert.ok(INCOMPLETE_RESEARCH_MESSAGE.length > 0);
  });
});

describe('replaceCitationBlocks', () => {
  it('returns the body text and array of citations when citations are present', () => {
    const result = replaceCitationBlocks(
      'Claim.<citation>{"number":1,"url":"https://a.com","snippet":"First."}</citation><citation>{"number":2,"url":"https://b.com"}</citation> More text.'
    );

    assert.deepEqual(result, {
      body: 'Claim.[^1][^2] More text.',
      citations: ['[^1]: [a.com](https://a.com) — First.', '[^2]: [b.com](https://b.com)'],
    });
  });

  it('returns the body text and undefined when no citations are present', () => {
    const result = replaceCitationBlocks('No citations.');

    assert.deepEqual(result, { body: 'No citations.', citations: undefined });
  });
});

describe('stripUsageBlocks', () => {
  it('removes all occurrences of a usage block', () => {
    assert.equal(stripUsageBlocks('<usage>a</usage>x<usage>b</usage>'), 'x');
  });
});

describe('replaceEnumItemBlocks', () => {
  it('converts an unordered enum list container to markdown bullets', () => {
    const result = replaceEnumItemBlocks(
      'Albums:<enum_start>ul</enum_start><enum_item>{"original_tokens":"The Fame","href":"https://example.com/fame"}</enum_item><enum_end></enum_end>'
    );

    assert.equal(result, 'Albums:\n* [The Fame](https://example.com/fame)');
  });

  it('converts an ordered enum list container to a numbered markdown list', () => {
    const result = replaceEnumItemBlocks(
      'Steps:<enum_start>ol</enum_start><enum_item>{"original_tokens":"First"}</enum_item><enum_item>{"original_tokens":"Second"}</enum_item><enum_end></enum_end>'
    );

    assert.equal(result, 'Steps:\n1. First\n2. Second');
  });

  it('converts standalone enum_item blocks as an unordered list', () => {
    const result = replaceEnumItemBlocks(
      'Albums:<enum_item>{"original_tokens":"The Fame"}</enum_item><enum_item>{"original_tokens":"Chromatica"}</enum_item>'
    );

    assert.equal(result, 'Albums:\n* The Fame\n* Chromatica');
  });
});
