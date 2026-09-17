import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import API from './index.js';
import config from '../config.js';

describe('BraveAPI.issueRequest', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.braveApiKey;
  let lastRequest: { url: URL; headers: Headers };

  beforeEach(() => {
    config.braveApiKey = 'test-key';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      lastRequest = {
        url: new URL(input instanceof Request ? input.url : input.toString()),
        headers: new Headers(init?.headers),
      };

      return new Response(JSON.stringify({ type: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    config.braveApiKey = originalKey;
  });

  it('sends the subscription token and default headers', async () => {
    await API.issueRequest('web', { query: 'brave' });

    assert.equal(lastRequest.headers.get('x-subscription-token'), 'test-key');
    assert.equal(lastRequest.headers.get('accept'), 'application/json');
    assert.equal(lastRequest.headers.get('accept-encoding'), 'gzip');
  });

  it('forwards per-request headers', async () => {
    await API.issueRequest('placeSearch', { query: 'coffee' }, { 'api-version': '2025-01-01' });

    assert.equal(lastRequest.headers.get('api-version'), '2025-01-01');
    // The defaults must survive the merge.
    assert.equal(lastRequest.headers.get('x-subscription-token'), 'test-key');
  });

  it('coerces non-string header values and drops undefined ones', async () => {
    await API.issueRequest(
      'llmContext',
      { query: 'brave' },
      { 'x-loc-lat': 45.5, 'x-loc-city': undefined }
    );

    assert.equal(lastRequest.headers.get('x-loc-lat'), '45.5');
    assert.equal(lastRequest.headers.has('x-loc-city'), false);
  });

  it('maps `query` to the `q` parameter and targets the endpoint path', async () => {
    await API.issueRequest('web', { query: 'brave browser' });

    assert.equal(lastRequest.url.pathname, '/res/v1/web/search');
    assert.equal(lastRequest.url.searchParams.get('q'), 'brave browser');
  });

  it('repeats `ids` for the local endpoints', async () => {
    await API.issueRequest('localDescriptions', { ids: ['a', 'b'] });

    assert.deepEqual(lastRequest.url.searchParams.getAll('ids'), ['a', 'b']);
  });

  it('joins result_filter and skips it when a summary is requested', async () => {
    await API.issueRequest('web', { query: 'brave', result_filter: ['web', 'locations'] });
    assert.equal(lastRequest.url.searchParams.get('result_filter'), 'web,locations');

    // result_filter alongside summary=true suppresses web results upstream.
    await API.issueRequest('web', {
      query: 'brave',
      summary: true,
      result_filter: ['web'],
    });
    assert.equal(lastRequest.url.searchParams.has('result_filter'), false);
  });

  it('keeps goggle definitions but rejects non-HTTPS goggle URLs', async () => {
    await API.issueRequest('web', {
      query: 'brave',
      goggles: ['https://example.com/g.goggle', 'http://example.com/g.goggle', '! name: test'],
    });

    assert.deepEqual(lastRequest.url.searchParams.getAll('goggles'), [
      'https://example.com/g.goggle',
      '! name: test',
    ]);
  });

  it('throws with the status and body when the API responds with an error', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'nope' }), {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(() => API.issueRequest('web', { query: 'brave' }), /422.*nope/s);
  });
});
