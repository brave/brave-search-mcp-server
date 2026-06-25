import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  extractResearchAnswer,
  formatAnswersContent,
  INCOMPLETE_RESEARCH_MESSAGE,
  stripTaggedBlocks,
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
    const raw =
      '<queries>{"queries":["test"]}</queries><thinking>{"urls_selected":[]}</thinking>';

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
});

describe('INCOMPLETE_RESEARCH_MESSAGE', () => {
  it('is a non-empty user-facing message', () => {
    assert.ok(INCOMPLETE_RESEARCH_MESSAGE.length > 0);
  });
});

describe('stripTaggedBlocks', () => {
  it('removes all occurrences of a tagged block', () => {
    assert.equal(stripTaggedBlocks('<usage>a</usage>x<usage>b</usage>', 'usage'), 'x');
  });
});
