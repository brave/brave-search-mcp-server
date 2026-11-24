import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeUnmatchedParentheses, getDisplayHostname } from './urls.js';

describe('encodeUnmatchedParentheses', () => {
  it('leaves URLs with matched or no parentheses as written', () => {
    for (const url of [
      'https://example.com/page',
      'https://en.wikipedia.org/wiki/Revolver_(Beatles_album)',
    ]) {
      assert.equal(encodeUnmatchedParentheses(url), url);
    }
  });

  it('percent-encodes every parenthesis when any is unmatched', () => {
    assert.equal(
      encodeUnmatchedParentheses('https://example.com/a)b'),
      'https://example.com/a%29b'
    );
    assert.equal(
      encodeUnmatchedParentheses('https://example.com/a(b'),
      'https://example.com/a%28b'
    );
    assert.equal(
      encodeUnmatchedParentheses('https://example.com/(a))b(c'),
      'https://example.com/%28a%29%29b%28c'
    );
  });
});

describe('getDisplayHostname', () => {
  it('drops a leading www.', () => {
    assert.equal(getDisplayHostname('https://www.example.com/page'), 'example.com');
    assert.equal(getDisplayHostname('https://docs.example.com/page'), 'docs.example.com');
  });

  it('returns the input when it is not a URL', () => {
    assert.equal(getDisplayHostname('not a url'), 'not a url');
  });
});
