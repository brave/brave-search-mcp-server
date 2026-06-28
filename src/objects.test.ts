import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isEmptyPlainObject, omitEmptyObjects } from './objects.js';

describe('isEmptyPlainObject', () => {
  it('returns true for empty plain objects', () => {
    assert.equal(isEmptyPlainObject({}), true);
  });

  it('returns false for non-empty values', () => {
    assert.equal(isEmptyPlainObject({ a: 1 }), false);
    assert.equal(isEmptyPlainObject([]), false);
    assert.equal(isEmptyPlainObject(null), false);
    assert.equal(isEmptyPlainObject(''), false);
  });
});

describe('omitEmptyObjects', () => {
  it('removes top-level empty objects', () => {
    assert.deepEqual(omitEmptyObjects({ keep: 1, drop: {} }), { keep: 1 });
  });

  it('removes nested empty objects', () => {
    assert.deepEqual(
      omitEmptyObjects({
        web_search_options: {
          user_location: {},
        },
      }),
      {}
    );
  });

  it('removes deeply nested empty objects', () => {
    assert.deepEqual(
      omitEmptyObjects({
        metadata: {
          session: {
            trace: {},
          },
        },
      }),
      {}
    );
  });

  it('keeps populated siblings after removing empty nested objects', () => {
    assert.deepEqual(
      omitEmptyObjects({
        web_search_options: {
          search_context_size: 'medium',
          user_location: {
            type: 'approximate',
            approximate: {},
          },
        },
      }),
      {
        web_search_options: {
          search_context_size: 'medium',
          user_location: {
            type: 'approximate',
          },
        },
      }
    );
  });
});
