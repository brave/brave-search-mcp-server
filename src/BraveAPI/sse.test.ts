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

function createSseResponseFromByteChunks(chunks: Uint8Array[]): Response {
  let index = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
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

  it('decodes UTF-8 split across byte chunks after the decoder flush', async () => {
    const line = 'data: {"choices":[{"delta":{"content":"世界"}}]}\n';
    const bytes = new TextEncoder().encode(line);
    const worldCharStart = bytes.indexOf(0xe4); // first byte of 世 (3-byte UTF-8)

    assert.notEqual(worldCharStart, -1);

    const response = createSseResponseFromByteChunks([
      bytes.slice(0, worldCharStart + 1),
      bytes.slice(worldCharStart + 1),
    ]);

    assert.equal(await consumeSseResponse(response), '世界');
  });

  it('keeps content from complete chunks when the stream ends on truncated JSON', async () => {
    const response = createSseResponse([
      'data: {"choices":[{"delta":{"content":"complete"}}]}\n',
      'data: {"choices":[{"delta":{"content":" lost',
    ]);

    assert.equal(await consumeSseResponse(response), 'complete');
  });
});
