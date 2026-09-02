import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import params from './params.js';

describe('web search_lang', () => {
  it('accepts Greek (el), which place_search/llm already allow', () => {
    const parsed = params.parse({ query: 'athina', search_lang: 'el' });
    assert.equal(parsed.search_lang, 'el');
  });

  it('maps ISO ja to Brave jp', () => {
    const parsed = params.parse({ query: 'tokyo', search_lang: 'ja' });
    assert.equal(parsed.search_lang, 'jp');
  });
});
