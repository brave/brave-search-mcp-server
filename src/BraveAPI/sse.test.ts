import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consumeSseResponse, extractContentFromSseText } from './sse.js';

function createSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream);
}

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

describe('consumeSseResponse', () => {
  it('appends a final unterminated SSE line to previously streamed content', async () => {
    const response = createSseResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
    ]);

    assert.equal(await consumeSseResponse(response), 'Hello world');
  });
});
