import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AnswersInputSchema } from './schemas/input.js';

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

  it('defaults stream to true when omitted', () => {
    const body = AnswersInputSchema.parse({
      messages: [{ role: 'user', content: 'What is TypeScript?' }],
    });

    assert.equal(body.stream, true);
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

  it('rejects multiple messages', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [
            { role: 'user', content: 'First' },
            { role: 'user', content: 'Second' },
          ],
        }),
      /Too (big|many)/i
    );
  });

  it('rejects out-of-range research_maximum_number_of_seconds', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          research_maximum_number_of_seconds: 0,
        }),
      /Too small/i
    );

    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          research_maximum_number_of_seconds: 301,
        }),
      /Too big/i
    );
  });

  it('rejects out-of-range research tuning values', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          research_maximum_number_of_tokens_per_query: 512,
        }),
      /Too small/i
    );

    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          research_maximum_number_of_iterations: 6,
        }),
      /Too big/i
    );
  });

  it('requires stream when enable_entities, enable_citations, or enable_research is enabled', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          stream: false,
          enable_citations: true,
        }),
      /stream must be true/
    );
  });

  it('rejects enable_entities with enable_research', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          enable_entities: true,
          enable_research: true,
        }),
      /doesn't support enable_entities/
    );
  });

  it('rejects enable_citations with enable_research', () => {
    assert.throws(
      () =>
        AnswersInputSchema.parse({
          messages: [{ role: 'user', content: 'test' }],
          enable_citations: true,
          enable_research: true,
        }),
      /doesn't support enable_citations/
    );
  });

  it('accepts compatible parameter combinations', () => {
    assert.doesNotThrow(() =>
      AnswersInputSchema.parse({
        messages: [{ role: 'user', content: 'test' }],
        enable_citations: true,
      })
    );
    assert.doesNotThrow(() =>
      AnswersInputSchema.parse({
        messages: [{ role: 'user', content: 'test' }],
        enable_research: true,
      })
    );
  });
});
