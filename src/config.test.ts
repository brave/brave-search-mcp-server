import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getOptions } from './config.js';

describe('getOptions', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('rejects whitespace-only API keys', () => {
    process.argv = ['node', 'index.js', '--brave-api-key', '   '];

    assert.equal(getOptions(), false);
  });
});
