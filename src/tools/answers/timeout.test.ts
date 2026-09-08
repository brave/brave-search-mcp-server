import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAnswersStreamingTimeoutMs,
  RESEARCH_STREAM_TIMEOUT_MS,
  SINGLE_SEARCH_STREAM_TIMEOUT_MS,
} from './timeout.js';

describe('getAnswersStreamingTimeoutMs', () => {
  it('uses a short timeout for single-search streaming', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_citations: true,
      }),
      SINGLE_SEARCH_STREAM_TIMEOUT_MS
    );
  });

  it('uses the research timeout regardless of research_maximum_number_of_seconds', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_research: true,
        research_maximum_number_of_seconds: 120,
      }),
      RESEARCH_STREAM_TIMEOUT_MS
    );
  });
});
