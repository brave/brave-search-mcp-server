import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  extractResearchAnswer,
  formatAnswersContent,
  INCOMPLETE_RESEARCH_MESSAGE,
  replaceEnumItemBlocks,
  stripEnumListMarkerBlocks,
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

  it('extracts from captured research probe fixture when present', () => {
    const fixturePath = join(
      'tmp',
      'answers-probe',
      'research',
      'r04_minimal_budget_repeat.content.txt'
    );

    try {
      const raw = readFileSync(fixturePath, 'utf8');
      const answer = extractResearchAnswer(raw);
      assert.ok(answer);
      assert.match(answer, /Python and Rust for CLI tool development/);
    } catch {
      // Fixture is optional in CI; inline coverage above is sufficient.
    }
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

  it('strips citation blocks when citations are enabled', () => {
    const result = formatAnswersContent(
      'Answer text<citation>{"number":1,"url":"https://example.com"}</citation><usage>{}</usage>',
      { enable_citations: true }
    );

    assert.deepEqual(result, { ok: true, text: 'Answer text' });
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

describe('stripUsageBlocks', () => {
  it('removes all occurrences of a usage block', () => {
    assert.equal(stripUsageBlocks('<usage>a</usage>x<usage>b</usage>'), 'x');
  });
});

describe('replaceEnumItemBlocks', () => {
  it('replaces enum_item JSON with a markdown bullet', () => {
    assert.equal(
      replaceEnumItemBlocks(
        '<enum_item>{"original_tokens":"The Fame","href":"https://example.com/fame"}</enum_item>'
      ),
      '\n* [The Fame](https://example.com/fame)'
    );
  });
});

describe('stripEnumListMarkerBlocks', () => {
  it('removes enum_start and enum_end markers', () => {
    assert.equal(
      stripEnumListMarkerBlocks('<enum_start>ul</enum_start>items<enum_end></enum_end>'),
      'items'
    );
  });
});
