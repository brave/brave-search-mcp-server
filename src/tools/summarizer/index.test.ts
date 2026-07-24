import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import API, { BraveApiError } from '../../BraveAPI/index.js';
import { SUMMARIZER_POLL } from '../../constants.js';
import { describeAccessFailure } from '../../plans.js';
import { execute, isRetryableError } from './index.js';

const params = { key: 'test-key' } as Parameters<typeof execute>[0];

describe('summarizer retry classification', () => {
  it('treats throttling and upstream failures as retryable', () => {
    assert.equal(isRetryableError(new BraveApiError(429, 'summarizer', 'Too Many Requests')), true);
    assert.equal(
      isRetryableError(new BraveApiError(500, 'summarizer', 'Internal Server Error')),
      true
    );
    assert.equal(
      isRetryableError(new BraveApiError(503, 'summarizer', 'Service Unavailable')),
      true
    );
  });

  it('treats deterministic client errors as permanent', () => {
    assert.equal(isRetryableError(new BraveApiError(401, 'summarizer', 'Unauthorized')), false);
    assert.equal(isRetryableError(new BraveApiError(403, 'summarizer', 'Forbidden')), false);
    assert.equal(
      isRetryableError(new BraveApiError(422, 'summarizer', 'Unprocessable Entity')),
      false
    );
  });

  it('treats errors without a status as transient', () => {
    assert.equal(isRetryableError(new Error('socket hang up')), true);
  });
});

describe('summarizer polling', () => {
  afterEach(() => mock.restoreAll());

  it('issues one request -- not twenty -- when the API key is invalid', async () => {
    const issueRequest = mock.method(API, 'issueRequest', async () => {
      throw new BraveApiError(401, 'summarizer', 'Unauthorized');
    });

    const result = await execute(params);

    assert.equal(issueRequest.mock.callCount(), 1);
    assert.equal(result.isError, true);
  });

  it('still exhausts its attempts on retryable failures', async () => {
    const issueRequest = mock.method(API, 'issueRequest', async () => {
      throw new BraveApiError(503, 'summarizer', 'Service Unavailable');
    });

    const result = await execute(params);

    assert.equal(issueRequest.mock.callCount(), SUMMARIZER_POLL.pollAttempts);
    assert.equal(result.isError, true);
  });

  it('paces polls when the summary is not yet complete', async () => {
    const issueRequest = mock.method(API, 'issueRequest', async () => ({ status: 'pending' }));

    const start = Date.now();
    await execute(params);
    const elapsed = Date.now() - start;

    // Nineteen inter-attempt delays. The previous implementation slept only on
    // the error path, so this case ran all twenty polls back to back.
    const expected = (SUMMARIZER_POLL.pollAttempts - 1) * SUMMARIZER_POLL.pollIntervalMs;

    assert.equal(issueRequest.mock.callCount(), SUMMARIZER_POLL.pollAttempts);
    assert.ok(elapsed >= expected * 0.8, `expected pacing of ~${expected}ms, saw ${elapsed}ms`);
  });

  it('returns the summary as soon as one completes', async () => {
    const issueRequest = mock.method(API, 'issueRequest', async () => ({
      status: 'complete',
      summary: [{ type: 'token', data: 'hello world' }],
    }));

    const result = await execute(params);

    assert.equal(issueRequest.mock.callCount(), 1);
    assert.equal(result.isError, false);

    const [block] = result.content;
    assert.equal(block.type, 'text');
    assert.equal(block.type === 'text' ? block.text : undefined, 'hello world');
  });

  it('stops polling when the caller cancels', async () => {
    const issueRequest = mock.method(API, 'issueRequest', async () => ({ status: 'pending' }));
    const controller = new AbortController();

    setTimeout(() => controller.abort(), SUMMARIZER_POLL.pollIntervalMs * 3);
    const result = await execute(params, { signal: controller.signal });

    assert.ok(issueRequest.mock.callCount() < SUMMARIZER_POLL.pollAttempts);
    assert.equal(result.isError, true);
  });
});

describe('summarizer error reporting', () => {
  afterEach(() => mock.restoreAll());

  it('tells the caller which plan the summarizer needs', async () => {
    mock.method(API, 'issueRequest', async () => {
      throw new BraveApiError(
        403,
        'summarizer',
        'HTTP 403\n\n' + describeAccessFailure('summarizer')
      );
    });

    const result = await execute(params);
    const [block] = result.content;
    const text = block.type === 'text' ? block.text : '';

    assert.equal(result.isError, true);
    assert.match(text, /Answers/);
    assert.match(text, /retrying will not help/);
  });
});
