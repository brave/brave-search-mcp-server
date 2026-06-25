import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAnswersStreamingTimeoutMs } from './timeout.js';

describe('getAnswersStreamingTimeoutMs', () => {
  it('uses a short timeout for non-research streaming', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_citations: true,
      }),
      90_000
    );
  });

  it('scales research timeout with the configured seconds budget plus buffer', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_research: true,
        research_maximum_number_of_seconds: 120,
      }),
      120_000 + 180_000
    );
  });

  it('defaults research budget to 180 seconds when omitted', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_research: true,
      }),
      180_000 + 180_000
    );
  });

  it('allows up to the API maximum research budget', () => {
    assert.equal(
      getAnswersStreamingTimeoutMs({
        messages: [{ role: 'user', content: 'test' }],
        model: 'brave',
        stream: true,
        enable_research: true,
        research_maximum_number_of_seconds: 300,
      }),
      300_000 + 180_000
    );
  });
});
