import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePort } from './utils.js';

describe('parsePort', () => {
  it('accepts valid integer ports', () => {
    assert.equal(parsePort(8080), 8080);
    assert.equal(parsePort('8080'), 8080);
    assert.equal(parsePort(1), 1);
    assert.equal(parsePort(65535), 65535);
  });

  it('rejects non-numeric and out-of-range values', () => {
    assert.equal(parsePort('abc'), null);
    assert.equal(parsePort('8080abc'), null);
    assert.equal(parsePort('8080.5'), null);
    assert.equal(parsePort(0), null);
    assert.equal(parsePort(65536), null);
    assert.equal(parsePort(-1), null);
    assert.equal(parsePort(''), null);
    assert.equal(parsePort(null), null);
    assert.equal(parsePort(undefined), null);
  });
});
