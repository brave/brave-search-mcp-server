import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canonicalizeOrigin, normalizeHost } from './rebinding.js';

describe('canonicalizeOrigin', () => {
  it('returns the canonical scheme://host[:port] form', () => {
    assert.equal(canonicalizeOrigin('https://example.com'), 'https://example.com');
    assert.equal(canonicalizeOrigin('https://example.com:8443'), 'https://example.com:8443');
    assert.equal(canonicalizeOrigin('http://localhost:3000'), 'http://localhost:3000');
  });

  it('lowercases scheme and host', () => {
    assert.equal(canonicalizeOrigin('HTTPS://Example.COM'), 'https://example.com');
  });

  it('drops the default port for the scheme', () => {
    assert.equal(canonicalizeOrigin('https://example.com:443'), 'https://example.com');
    assert.equal(canonicalizeOrigin('http://example.com:80'), 'http://example.com');
  });

  it('ignores path, query, and fragment', () => {
    assert.equal(canonicalizeOrigin('https://example.com/a/b?c=d#e'), 'https://example.com');
  });

  it('returns null for unparseable values', () => {
    assert.equal(canonicalizeOrigin(''), null);
    assert.equal(canonicalizeOrigin('not a url'), null);
    assert.equal(canonicalizeOrigin('example.com'), null);
  });
});

describe('normalizeHost', () => {
  it('returns the bare, lowercased hostname', () => {
    assert.equal(normalizeHost('example.com'), 'example.com');
    assert.equal(normalizeHost('Example.COM'), 'example.com');
    assert.equal(normalizeHost('127.0.0.1'), '127.0.0.1');
  });

  it('strips the port', () => {
    assert.equal(normalizeHost('example.com:8080'), 'example.com');
    assert.equal(normalizeHost('example.com:443'), 'example.com');
  });

  it('unwraps bracketed IPv6 literals', () => {
    assert.equal(normalizeHost('[::1]'), '::1');
    assert.equal(normalizeHost('[::1]:8080'), '::1');
    assert.equal(normalizeHost('[2001:DB8::1]:443'), '2001:db8::1');
  });

  it('returns null for empty or whitespace-only values', () => {
    assert.equal(normalizeHost(''), null);
    assert.equal(normalizeHost('   '), null);
  });

  it('returns null for a non-numeric port', () => {
    assert.equal(normalizeHost('example.com:80evil'), null);
    assert.equal(normalizeHost('example.com:99999999'), null);
  });

  it('returns null for schemes', () => {
    assert.equal(normalizeHost('https://example.com'), null);
    assert.equal(normalizeHost('http://example.com'), null);
  });

  it('returns null for malformed bracketed IPv6 with trailing junk', () => {
    assert.equal(normalizeHost('[::1]evil.example'), null);
    assert.equal(normalizeHost('[::1'), null);
  });

  it('returns null when userinfo, path, query, or fragment is present', () => {
    assert.equal(normalizeHost('evil.com@example.com'), null);
    assert.equal(normalizeHost('example.com/path'), null);
    assert.equal(normalizeHost('example.com?q=1'), null);
    assert.equal(normalizeHost('example.com#frag'), null);
  });
});
