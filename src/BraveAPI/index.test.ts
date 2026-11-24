import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import API from './index.js';
import { MAX_RESPONSE_BYTES } from './request.js';

const originalFetch = globalThis.fetch;

/** Routes `fetch` to `respond`, which receives the request's abort signal. */
function mockFetch(respond: (signal: AbortSignal) => Response | Promise<Response>) {
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    respond(init!.signal!)) as typeof fetch;
}

/** A response body that never finishes until the request is aborted. */
function stalledResponse(signal: AbortSignal): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"results":'));
      signal.addEventListener('abort', () => controller.error(signal.reason));
    },
  });
  return new Response(body, { status: 200 });
}

const search = (options?: Parameters<typeof API.issueRequest>[3]) =>
  API.issueRequest<'news'>('news', { query: 'brave' } as never, {}, options);

describe('issueRequest', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses a JSON success body', async () => {
    mockFetch(() => new Response(JSON.stringify({ results: [{ title: 'ok' }] })));

    assert.deepEqual(await search(), { results: [{ title: 'ok' }] });
  });

  it('times out when the response stalls', async () => {
    mockFetch(stalledResponse);

    await assert.rejects(search({ timeoutMs: 50 }), /^Error: Brave API request timed out/);
  });

  it('rejects when the caller signal aborts', async () => {
    mockFetch(stalledResponse);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    await assert.rejects(
      search({ signal: controller.signal }),
      /^Error: Brave API request was cancelled/
    );
  });

  it('rejects and cancels the stream when the body exceeds the size limit', async () => {
    let cancelled = false;
    const chunk = new Uint8Array(1024 * 1024).fill(0x20);
    mockFetch(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.enqueue(chunk);
            },
            cancel() {
              cancelled = true;
            },
          })
        )
    );

    await assert.rejects(search(), new RegExp(`exceeded ${MAX_RESPONSE_BYTES} bytes`));
    assert.equal(cancelled, true);
  });

  it('reports the status line for a non-JSON error body', async () => {
    mockFetch(
      () => new Response('upstream unavailable', { status: 502, statusText: 'Bad Gateway' })
    );

    await assert.rejects(search(), { message: '502 Bad Gateway\nupstream unavailable' });
  });
});
