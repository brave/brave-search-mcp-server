import assert from 'node:assert/strict';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { streamChatCompletion, type StreamChatCompletionOptions } from './chatCompletions.js';

const chunk = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

type ReceivedRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
};

/** Requests a completion whose `scenario` tells the local server how to respond. */
const stream = (scenario: string, options: StreamChatCompletionOptions = { timeoutMs: 5_000 }) =>
  streamChatCompletion({ scenario }, options);

describe('streamChatCompletion', () => {
  const received: ReceivedRequest[] = [];
  let server: Server;
  let restoreFetch: () => void;

  before(async () => {
    server = createServer(async (request, response) => {
      let text = '';
      for await (const part of request) text += part;
      const body = JSON.parse(text) as Record<string, unknown>;
      received.push({ method: request.method, url: request.url, headers: request.headers, body });

      if (body.scenario === 'error') {
        response.writeHead(422, 'Unprocessable Entity', { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: { detail: 'Unsupported option' } }));
        return;
      }

      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write(chunk('partial'));

      // 'stall' never finishes its stream.
      if (body.scenario === 'ok') {
        response.end(`${chunk(' answer')}data: [DONE]\n\n`);
      } else if (body.scenario === 'truncated') {
        response.end();
      } else if (body.scenario === 'open-after-done') {
        response.write('data: [DONE]\n\n');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    // streamChatCompletion always targets the Brave API origin; route it to the local server.
    const { port } = server.address() as AddressInfo;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const { pathname } = new URL(input instanceof Request ? input.url : input.toString());
      return originalFetch(`http://127.0.0.1:${port}${pathname}`, init);
    }) as typeof fetch;
    restoreFetch = () => {
      globalThis.fetch = originalFetch;
    };
  });

  after(async () => {
    restoreFetch();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it('POSTs the body as a streaming JSON request to the chat completions endpoint', async () => {
    await stream('ok');
    const request = received.at(-1);

    assert.equal(request?.method, 'POST');
    assert.equal(request?.url, '/res/v1/chat/completions');
    assert.equal(request?.headers.accept, 'text/event-stream');
    assert.equal(request?.headers['content-type'], 'application/json');
    assert.deepEqual(request?.body, { scenario: 'ok', stream: true });
  });

  it('returns the streamed content chunks in order', async () => {
    const { deltas } = await stream('ok');
    assert.deepEqual(deltas, ['partial', ' answer']);
  });

  it('returns at [DONE] even if the server keeps the stream open', async () => {
    const { deltas } = await stream('open-after-done');
    assert.deepEqual(deltas, ['partial']);
  });

  it('reports a stream that closes before [DONE]', async () => {
    await assert.rejects(stream('truncated'), /ended before completion/);
  });

  it('reports a timeout when the stream outlives timeoutMs', async () => {
    await assert.rejects(stream('stall', { timeoutMs: 200 }), /timed out/);
  });

  it('reports a cancellation when the client signal aborts', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);

    await assert.rejects(
      stream('stall', { timeoutMs: 5_000, signal: controller.signal }),
      /cancelled/
    );
  });

  it('includes the error body for non-OK responses', async () => {
    await assert.rejects(
      stream('error'),
      /^Error: 422 Unprocessable Entity\n[\s\S]*Unsupported option/
    );
  });
});
