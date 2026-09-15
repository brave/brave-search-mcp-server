import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildErrorMessage } from './request.js';

function errorResponse(body: string, status = 400, statusText = 'Bad Request'): Response {
  return new Response(body, { status, statusText });
}

describe('buildErrorMessage', () => {
  it('formats JSON error bodies', async () => {
    const message = await buildErrorMessage(
      errorResponse(JSON.stringify({ error: 'invalid_request', message: 'Bad input' }))
    );

    assert.match(message, /^400 Bad Request\n/);
    assert.match(message, /"error": "invalid_request"/);
    assert.match(message, /"message": "Bad input"/);
  });

  it('includes plain-text error bodies when JSON parsing fails', async () => {
    const message = await buildErrorMessage(errorResponse('upstream service unavailable'));

    assert.equal(message, '400 Bad Request\nupstream service unavailable');
  });

  it('includes malformed JSON as raw text without attempting a second body read', async () => {
    const message = await buildErrorMessage(errorResponse('{"error": "truncated'));

    assert.equal(message, '400 Bad Request\n{"error": "truncated');
  });

  it('returns only the status line when the body is empty', async () => {
    const message = await buildErrorMessage(errorResponse('', 502, 'Bad Gateway'));

    assert.equal(message, '502 Bad Gateway');
  });
});
