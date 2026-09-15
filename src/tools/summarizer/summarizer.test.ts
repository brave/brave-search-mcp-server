import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSuccessfulSummarizerContent,
  description,
  SUMMARIZER_DEPRECATION_NOTICE,
} from './index.js';

describe('brave_summarizer deprecation', () => {
  it('documents deprecation in the tool description', () => {
    assert.match(description, /DEPRECATED/i);
    assert.match(description, /brave_answers/);
  });

  it('returns deprecation notice in a separate content block from the summary', () => {
    const content = buildSuccessfulSummarizerContent('Summary content.');

    assert.equal(content.length, 2);
    assert.equal(content[0]?.type, 'text');
    assert.equal(content[0]?.text, SUMMARIZER_DEPRECATION_NOTICE);
    assert.match(content[0]?.text ?? '', /Deprecation notice/);
    assert.match(content[0]?.text ?? '', /brave_answers/);
    assert.equal(content[1]?.type, 'text');
    assert.equal(content[1]?.text, 'Summary content.');
  });
});
