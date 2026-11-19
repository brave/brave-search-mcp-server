import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readChatCompletionStream } from './sse.js';

const event = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

/** A response whose body delivers each chunk as a separate read; strings are UTF-8 encoded. */
function createSseResponse(chunks: Array<string | Uint8Array>): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = chunks[index++];
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream);
}

describe('readChatCompletionStream', () => {
  it('returns delta content from each event in order', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      '',
      'data: [DONE]',
      '',
      '',
    ].join('\r\n');

    const { deltas } = await readChatCompletionStream(createSseResponse([sse]));
    assert.deepEqual(deltas, ['Hello', ' world']);
  });

  it('reports the last finish_reason, or none when the stream omits it', async () => {
    const finished = createSseResponse([
      'data: {"choices":[{"delta":{"content":"Cut"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":""},"finish_reason":"length"}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    const unfinished = createSseResponse([event('Hello'), 'data: [DONE]\n\n']);

    assert.deepEqual(await readChatCompletionStream(finished), {
      deltas: ['Cut'],
      finishReason: 'length',
    });
    assert.equal((await readChatCompletionStream(unfinished)).finishReason, undefined);
  });

  it('ignores malformed JSON, empty data, comments, and other fields', async () => {
    const sse = [
      'event: ping',
      '',
      'data:',
      '',
      'data: not-json',
      '',
      ': keep-alive',
      '',
      event('ok'),
      'data: [DONE]\n\n',
    ].join('\n');

    assert.deepEqual((await readChatCompletionStream(createSseResponse([sse]))).deltas, ['ok']);
  });

  it('joins an event whose data spans several lines', async () => {
    const response = createSseResponse([
      'data: {"choices":[{"delta":\ndata: {"content":"joined"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    assert.deepEqual((await readChatCompletionStream(response)).deltas, ['joined']);
  });

  it('decodes UTF-8 split across byte chunks', async () => {
    const bytes = new TextEncoder().encode(event('世界'));
    const worldCharStart = bytes.indexOf(0xe4); // first byte of 世 (3-byte UTF-8)

    assert.notEqual(worldCharStart, -1);

    const response = createSseResponse([
      bytes.slice(0, worldCharStart + 1),
      bytes.slice(worldCharStart + 1),
      'data: [DONE]\n\n',
    ]);

    assert.deepEqual((await readChatCompletionStream(response)).deltas, ['世界']);
  });

  it('rejects a stream that ends before [DONE]', async () => {
    const response = createSseResponse([
      event('complete'),
      'data: {"choices":[{"delta":{"content":" lost',
    ]);

    await assert.rejects(readChatCompletionStream(response), /ended before completion/);
  });

  it('rejects an error event in the stream', async () => {
    const response = createSseResponse([
      event('Partial'),
      'data: {"error":{"message":"upstream failure"}}\n\n',
      'data: [DONE]\n\n',
    ]);

    await assert.rejects(readChatCompletionStream(response), /reported an error: upstream failure/);
  });

  it('stops at [DONE] and cancels a stream that stays open', { timeout: 2_000 }, async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`${event('done')}data: [DONE]\n\n`));
      },
      cancel() {
        cancelled = true;
      },
    });

    assert.deepEqual((await readChatCompletionStream(new Response(stream))).deltas, ['done']);
    assert.equal(cancelled, true);
  });
});
