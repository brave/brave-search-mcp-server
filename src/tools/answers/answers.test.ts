import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAnswersRequestBody } from './index.js';
import { answersQueryParams } from './params.js';

describe('buildAnswersRequestBody', () => {
  it('builds a blocking single-search request by default', () => {
    const body = buildAnswersRequestBody({
      query: 'What is TypeScript?',
      model: 'brave',
      country: 'US',
      language: 'en',
      safesearch: 'moderate',
      enable_entities: false,
      enable_citations: false,
      enable_research: false,
      research_allow_thinking: true,
    });

    assert.deepEqual(body.messages, [{ role: 'user', content: 'What is TypeScript?' }]);
    assert.equal(body.model, 'brave');
    assert.equal(body.stream, false);
  });

  it('forces streaming when citations are enabled', () => {
    const body = buildAnswersRequestBody({
      query: 'Latest fusion news',
      model: 'brave',
      country: 'US',
      language: 'en',
      safesearch: 'moderate',
      enable_entities: false,
      enable_citations: true,
      enable_research: false,
      research_allow_thinking: true,
    });

    assert.equal(body.stream, true);
    assert.equal(body.enable_citations, true);
  });

  it('forces streaming when research mode is enabled', () => {
    const body = buildAnswersRequestBody({
      query: 'Compare quantum approaches',
      model: 'brave',
      country: 'US',
      language: 'en',
      safesearch: 'moderate',
      enable_entities: false,
      enable_citations: false,
      enable_research: true,
      research_allow_thinking: true,
      research_maximum_number_of_iterations: 3,
    });

    assert.equal(body.stream, true);
    assert.equal(body.enable_research, true);
    assert.equal(body.research_maximum_number_of_iterations, 3);
  });

  it('forces streaming when entities are enabled', () => {
    const body = buildAnswersRequestBody({
      query: 'Who founded Tesla?',
      model: 'brave',
      country: 'US',
      language: 'en',
      safesearch: 'moderate',
      enable_entities: true,
      enable_citations: false,
      enable_research: false,
      research_allow_thinking: true,
    });

    assert.equal(body.stream, true);
    assert.equal(body.enable_entities, true);
  });
});

describe('answersQueryParams', () => {
  it('rejects incompatible research and citation options', () => {
    const result = answersQueryParams.safeParse({
      query: 'test',
      enable_research: true,
      enable_citations: true,
    });

    assert.equal(result.success, false);
  });
});
