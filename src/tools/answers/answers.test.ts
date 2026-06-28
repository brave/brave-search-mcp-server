import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AnswersInputSchema } from './schemas/input.js';
import { prepareAnswersRequestBody } from './index.js';

describe('AnswersInputSchema', () => {
  it('accepts an API-shaped request body', () => {
    const body = AnswersInputSchema.parse({
      messages: [{ role: 'user', content: 'What is TypeScript?' }],
      model: 'brave',
      stream: false,
    });

    assert.deepEqual(body.messages, [{ role: 'user', content: 'What is TypeScript?' }]);
    assert.equal(body.model, 'brave');
    assert.equal(body.stream, false);
  });

  it('accepts web_search_options.user_location', () => {
    const body = AnswersInputSchema.parse({
      messages: [{ role: 'user', content: 'best coffee shops nearby' }],
      model: 'brave',
      web_search_options: {
        search_context_size: 'medium',
        user_location: {
          type: 'approximate',
          approximate: {
            city: 'San Francisco',
            country: 'US',
            region: 'California',
            timezone: 'America/Los_Angeles',
          },
        },
      },
    });

    assert.deepEqual(body.web_search_options, {
      search_context_size: 'medium',
      user_location: {
        type: 'approximate',
        approximate: {
          city: 'San Francisco',
          country: 'US',
          region: 'California',
          timezone: 'America/Los_Angeles',
        },
      },
    });
  });
});

describe('prepareAnswersRequestBody', () => {
  it('drops empty objects', () => {
    const body = prepareAnswersRequestBody(
      AnswersInputSchema.parse({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'brave',
        metadata: {},
      })
    );

    assert.equal('metadata' in body, false);
  });

  it('keeps non-empty object fields', () => {
    const body = prepareAnswersRequestBody(
      AnswersInputSchema.parse({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'brave',
        metadata: { session_id: 'abc' },
      })
    );

    assert.deepEqual(body.metadata, { session_id: 'abc' });
  });
});
