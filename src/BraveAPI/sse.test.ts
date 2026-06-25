import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractContentFromSseText } from './sse.js';

describe('extractContentFromSseText', () => {
  it('concatenates delta content from SSE data lines', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    assert.equal(extractContentFromSseText(sse), 'Hello world');
  });

  it('ignores malformed JSON and empty data lines', () => {
    const sse = [
      'data:',
      'data: not-json',
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      '',
    ].join('\n');

    assert.equal(extractContentFromSseText(sse), 'ok');
  });

  it('returns an empty string when no content chunks are present', () => {
    const sse = ['event: ping', 'data: [DONE]', ''].join('\n');
    assert.equal(extractContentFromSseText(sse), '');
  });
});
