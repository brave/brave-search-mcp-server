import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import params from './params.js';

describe('news freshness', () => {
  it('defaults to pd (last 24 hours), matching the README', () => {
    const parsed = params.parse({ query: 'brave browser' });
    assert.equal(parsed.freshness, 'pd');
  });
});
