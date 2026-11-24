import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { readChatCompletionStream } from '../../BraveAPI/sse.js';
import { formatAnswer } from './format.js';

const fixtureDeltas = async (file: string) =>
  (
    await readChatCompletionStream(
      new Response(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'))
    )
  ).deltas;

const singleSearch = { research: false };
const research = { research: true };

describe('formatAnswer', () => {
  it('strips usage metadata', () => {
    assert.equal(
      formatAnswer(['Hello world ', '<usage>{"X-Request-Total-Cost":0}</usage>'], singleSearch),
      'Hello world'
    );
  });

  it('returns null when only metadata remains', () => {
    assert.equal(
      formatAnswer([' ', '<usage>{"X-Request-Total-Cost":0}</usage>'], singleSearch),
      null
    );
  });

  it('keeps tags written inside single-search answer text', () => {
    const deltas = [
      'Use `<answer>42</answer>` as the XML value. Ask the model to wrap it: `<ans',
      'wer>42</answer>`.\n```html\n<progress>50%</progress>\n<thinking>{"step":1}</thinking>\n```',
    ];

    assert.equal(formatAnswer(deltas, singleSearch), deltas.join(''));
  });

  it('returns the last research answer, unwrapped from its JSON payload', () => {
    const deltas = [
      '<queries>{"queries":["q"]}</queries>',
      '<answer>{"answer":"Draft."}</answer>',
      '<answer>{"answer":"Final."}</answer>',
      '<usage>{}</usage>',
      '<progress>{}</progress>',
    ];

    assert.equal(formatAnswer(deltas, research), 'Final.');
  });

  it('returns a research answer as written, keeping tags inside it', () => {
    const answer =
      'Wrap the result as `<answer>42</answer>`; <progress>50%</progress> shows a bar.';
    const deltas = [`<answer>${JSON.stringify({ answer })}</answer>`, '<usage>{}</usage>'];

    assert.equal(formatAnswer(deltas, research), answer);
  });

  it('returns a non-JSON answer block as-is', () => {
    assert.equal(formatAnswer(['<answer>Final answer.</answer>'], research), 'Final answer.');
  });

  it('returns null for research scaffolding without an answer', () => {
    const deltas = [
      '<queries>{"queries":["q"]}</queries>',
      '<analyzing>{"urls":3}</analyzing>',
      '<thinking>{"urls_selected":[]}</thinking>',
      '<blindspots>{}</blindspots>',
      '<progress>{}</progress>',
    ];

    assert.equal(formatAnswer(deltas, research), null);
  });

  it('converts citations to footnotes with snippets on one line', () => {
    const deltas = [
      'Claim.',
      '<citation>{"number":1,"url":"https://www.a.com/x","snippet":"First\\n## line."}</citation>',
      '<citation>{"number":2,"url":"https://b.com"}</citation>',
      ' More.',
    ];

    assert.equal(
      formatAnswer(deltas, singleSearch),
      'Claim.[^1][^2] More.\n\n[^1]: [a.com](https://www.a.com/x) — First ## line.\n[^2]: [b.com](https://b.com)'
    );
  });

  it('drops citations without a number or web URL', () => {
    const deltas = [
      'Claim.',
      '<citation>{"number":1,"url":"javascript:alert(1)"}</citation>',
      '<citation>{"url":"https://a.com"}</citation>',
      '<citation>not json</citation>',
    ];

    assert.equal(formatAnswer(deltas, singleSearch), 'Claim.');
  });

  it('percent-encodes unmatched parentheses in citation links', () => {
    const deltas = ['Claim.', '<citation>{"number":1,"url":"https://a.com/x)y"}</citation>'];

    assert.equal(
      formatAnswer(deltas, singleSearch),
      'Claim.[^1]\n\n[^1]: [a.com](https://a.com/x%29y)'
    );
  });

  it('gives every citation marker in a real response a footnote', async () => {
    const text = formatAnswer(await fixtureDeltas('citations.sse'), singleSearch) ?? '';

    const markers = new Set([...text.matchAll(/\[\^(\d+)\](?!:)/g)].map((match) => match[1]));
    const definitions = text.split('\n').filter((line) => /^\[\^\d+\]: /.test(line));

    assert.equal(markers.size, 3);
    assert.deepEqual(
      definitions.map((line) => line.match(/^\[\^(\d+)\]/)?.[1]),
      [...markers].sort()
    );
  });
});
