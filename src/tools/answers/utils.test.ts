import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assembleFromResponse, normalizeNonStreaming, normalizeStreamingChunks } from './utils.js';
import type {
  AnswersNonStreamingResponse,
  AnswersStreamingChunk,
  Citation,
  Usage,
} from './schemas/output.js';

const BASE_USAGE: Usage = {
  completion_tokens: 5,
  prompt_tokens: 10,
  total_tokens: 15,
};

/** Minimal valid non-streaming API response. */
function nonStreamingFixture(
  content = 'Hello world.',
  finishReason: 'stop' | 'length' = 'stop'
): AnswersNonStreamingResponse {
  return {
    model: 'brave-pro',
    system_fingerprint: '',
    object: 'chat.completion',
    id: 'ns-id-1',
    created: 1_000_000,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: finishReason }],
    usage: { ...BASE_USAGE },
  };
}

/** Content chunk (no finish, no usage). */
function contentChunk(content: string, id = 'ss-id-1'): AnswersStreamingChunk {
  return {
    model: 'brave-pro',
    system_fingerprint: '',
    object: 'chat.completion.chunk',
    id,
    created: 1_000_001,
    choices: [{ delta: { role: 'assistant', content }, finish_reason: null }],
    usage: null,
  };
}

/** Final stop chunk (finish_reason = 'stop', usage present). */
function stopChunk(
  finishReason: 'stop' | 'length' = 'stop',
  id = 'ss-id-1'
): AnswersStreamingChunk {
  return {
    model: 'brave-pro',
    system_fingerprint: '',
    object: 'chat.completion.chunk',
    id,
    created: 1_000_001,
    choices: [{ delta: { role: 'assistant', content: '' }, finish_reason: finishReason }],
    usage: { ...BASE_USAGE },
  };
}

const SAMPLE_CITATION: Citation = {
  number: 1,
  url: 'https://example.com/article',
  favicon: 'https://example.com/favicon.ico',
  snippet: 'An excerpt from the source.',
  start_index: 6,
  end_index: 6,
};

/** A chunk whose entire delta.content is a <citation>{JSON}</citation> tag. */
function citationChunk(citation: Citation, id = 'ss-id-1'): AnswersStreamingChunk {
  return {
    model: 'brave-pro',
    system_fingerprint: '',
    object: 'chat.completion.chunk',
    id,
    created: 1_000_001,
    choices: [
      {
        delta: { role: 'assistant', content: `<citation>${JSON.stringify(citation)}</citation>` },
        finish_reason: null,
      },
    ],
    usage: null,
  };
}

/** Builds a mock streaming Response from an array of chunks + [DONE]. */
function makeStreamingResponse(chunks: AnswersStreamingChunk[]): Response {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

/** Builds a mock non-streaming JSON Response. */
function makeJsonResponse(data: AnswersNonStreamingResponse): Response {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

describe('normalizeNonStreaming', () => {
  it('passes id, model, and created through unchanged', () => {
    const output = normalizeNonStreaming(nonStreamingFixture());
    assert.equal(output.id, 'ns-id-1');
    assert.equal(output.model, 'brave-pro');
    assert.equal(output.created, 1_000_000);
  });

  it('extracts content from choices[0].message.content', () => {
    const output = normalizeNonStreaming(nonStreamingFixture('The answer is 42.'));
    assert.equal(output.content, 'The answer is 42.');
  });

  it('preserves finish_reason: stop', () => {
    assert.equal(normalizeNonStreaming(nonStreamingFixture('x', 'stop')).finish_reason, 'stop');
  });

  it('preserves finish_reason: length', () => {
    assert.equal(normalizeNonStreaming(nonStreamingFixture('x', 'length')).finish_reason, 'length');
  });

  it('carries usage through unchanged', () => {
    assert.deepEqual(normalizeNonStreaming(nonStreamingFixture()).usage, BASE_USAGE);
  });
});

describe('normalizeStreamingChunks', () => {
  it('returns a zero-value output for an empty chunk array', () => {
    const output = normalizeStreamingChunks([]);
    assert.equal(output.id, '');
    assert.equal(output.model, '');
    assert.equal(output.created, 0);
    assert.equal(output.content, '');
    assert.equal(output.finish_reason, null);
    assert.equal(output.usage, null);
  });

  it('takes id, model, and created from the first chunk', () => {
    const chunks = [contentChunk('Hi', 'my-stream-id'), stopChunk('stop', 'my-stream-id')];
    const output = normalizeStreamingChunks(chunks);
    assert.equal(output.id, 'my-stream-id');
    assert.equal(output.model, 'brave-pro');
    assert.equal(output.created, 1_000_001);
  });

  it('concatenates delta content fragments in order', () => {
    const chunks = [
      contentChunk('Par'),
      contentChunk('is '),
      contentChunk('is the capital.'),
      stopChunk(),
    ];
    assert.equal(normalizeStreamingChunks(chunks).content, 'Paris is the capital.');
  });

  it('strips Brave <usage> metadata fragments from the assembled text', () => {
    const chunks = [
      contentChunk('Hello.'),
      contentChunk('<usage>{"X-Request-Requests":1,"X-Request-Tokens-Out":5}'),
      stopChunk(),
    ];
    assert.equal(normalizeStreamingChunks(chunks).content, 'Hello.');
  });

  it('does not strip content that contains <usage> but does not start with it', () => {
    const chunks = [contentChunk('see <usage> docs'), stopChunk()];
    assert.equal(normalizeStreamingChunks(chunks).content, 'see <usage> docs');
  });

  it('empty stop-chunk content does not appear in the assembled text', () => {
    const chunks = [contentChunk('Hello.'), stopChunk()];
    assert.equal(normalizeStreamingChunks(chunks).content, 'Hello.');
  });

  it('sets finish_reason to stop from the stop chunk', () => {
    assert.equal(
      normalizeStreamingChunks([contentChunk('x'), stopChunk('stop')]).finish_reason,
      'stop'
    );
  });

  it('sets finish_reason to length when truncated', () => {
    assert.equal(
      normalizeStreamingChunks([contentChunk('x'), stopChunk('length')]).finish_reason,
      'length'
    );
  });

  it('finish_reason is null when no stop chunk is present', () => {
    assert.equal(normalizeStreamingChunks([contentChunk('x')]).finish_reason, null);
  });

  it('takes usage from the stop chunk', () => {
    assert.deepEqual(normalizeStreamingChunks([contentChunk('x'), stopChunk()]).usage, BASE_USAGE);
  });

  it('usage is null when no stop chunk is present', () => {
    assert.equal(normalizeStreamingChunks([contentChunk('x')]).usage, null);
  });

  it('citations is undefined when no citation chunks are present', () => {
    assert.equal(
      normalizeStreamingChunks([contentChunk('Hello.'), stopChunk()]).citations,
      undefined
    );
  });

  it('extracts a citation fragment into the citations array', () => {
    const chunks = [contentChunk('Hello.'), citationChunk(SAMPLE_CITATION), stopChunk()];
    const output = normalizeStreamingChunks(chunks);
    assert.deepEqual(output.citations, [SAMPLE_CITATION]);
  });

  it('excludes citation fragment content from the assembled text', () => {
    const chunks = [contentChunk('Hello.'), citationChunk(SAMPLE_CITATION), stopChunk()];
    assert.equal(normalizeStreamingChunks(chunks).content, 'Hello.');
  });

  it('preserves citation insertion order', () => {
    const c2: Citation = {
      ...SAMPLE_CITATION,
      number: 2,
      url: 'https://example.com/b',
      start_index: 12,
      end_index: 12,
    };
    const chunks = [
      contentChunk('Hello '),
      citationChunk(SAMPLE_CITATION),
      contentChunk('world.'),
      citationChunk(c2),
      stopChunk(),
    ];
    const output = normalizeStreamingChunks(chunks);
    assert.equal(output.citations?.length, 2);
    assert.equal(output.citations?.[0].number, 1);
    assert.equal(output.citations?.[1].number, 2);
    assert.equal(output.content, 'Hello world.');
  });

  it('treats a malformed <citation> tag as regular text', () => {
    const badChunk = contentChunk('<citation>not-json</citation>');
    const chunks = [contentChunk('OK.'), badChunk, stopChunk()];
    const output = normalizeStreamingChunks(chunks);
    // Malformed citations fall through to 'text'; content includes the raw tag
    assert.ok(output.content.includes('<citation>not-json</citation>'));
    assert.equal(output.citations, undefined);
  });
});

describe('assembleFromResponse', () => {
  describe('non-streaming path (Content-Type: application/json)', () => {
    it('assembles the full output from a JSON response', async () => {
      const fixture = nonStreamingFixture('Paris is the capital of France.');
      const output = await assembleFromResponse(makeJsonResponse(fixture));

      assert.equal(output.id, fixture.id);
      assert.equal(output.model, fixture.model);
      assert.equal(output.created, fixture.created);
      assert.equal(output.content, 'Paris is the capital of France.');
      assert.equal(output.finish_reason, 'stop');
      assert.deepEqual(output.usage, BASE_USAGE);
    });
  });

  describe('streaming path (Content-Type: text/event-stream)', () => {
    it('assembles content from ordered SSE chunks', async () => {
      const chunks = [contentChunk('Paris '), contentChunk('is the capital.'), stopChunk()];
      const output = await assembleFromResponse(makeStreamingResponse(chunks));

      assert.equal(output.id, 'ss-id-1');
      assert.equal(output.content, 'Paris is the capital.');
      assert.equal(output.finish_reason, 'stop');
      assert.deepEqual(output.usage, BASE_USAGE);
    });

    it('strips Brave <usage> fragments from the assembled content', async () => {
      const chunks = [
        contentChunk('Answer.'),
        contentChunk('<usage>{"X-Request-Queries":1,"X-Request-Tokens-Out":5}'),
        stopChunk(),
      ];
      const output = await assembleFromResponse(makeStreamingResponse(chunks));
      assert.equal(output.content, 'Answer.');
    });

    it('extracts citations into the citations array end-to-end', async () => {
      const chunks = [contentChunk('Hello.'), citationChunk(SAMPLE_CITATION), stopChunk()];
      const output = await assembleFromResponse(makeStreamingResponse(chunks));
      assert.equal(output.content, 'Hello.');
      assert.deepEqual(output.citations, [SAMPLE_CITATION]);
    });

    it('stops reading at the [DONE] sentinel and ignores any data lines after it', async () => {
      const body =
        `data: ${JSON.stringify(contentChunk('Hello.'))}\n\n` +
        `data: ${JSON.stringify(stopChunk())}\n\n` +
        'data: [DONE]\n\n' +
        `data: ${JSON.stringify(contentChunk(' EXTRA'))}\n\n`;

      const output = await assembleFromResponse(
        new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
      );
      assert.equal(output.content, 'Hello.');
    });

    it('silently skips malformed (non-JSON) SSE data lines', async () => {
      const body =
        'data: not-valid-json\n\n' +
        `data: ${JSON.stringify(contentChunk('OK.'))}\n\n` +
        `data: ${JSON.stringify(stopChunk())}\n\n` +
        'data: [DONE]\n\n';

      const output = await assembleFromResponse(
        new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
      );
      assert.equal(output.content, 'OK.');
    });

    it('silently skips SSE data lines that are valid JSON but fail schema validation', async () => {
      const body =
        'data: {"not":"a chunk"}\n\n' +
        `data: ${JSON.stringify(contentChunk('Good.'))}\n\n` +
        `data: ${JSON.stringify(stopChunk())}\n\n` +
        'data: [DONE]\n\n';

      const output = await assembleFromResponse(
        new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
      );
      assert.equal(output.content, 'Good.');
    });
  });
});
