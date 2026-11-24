import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

// Real Answers API responses, trimmed to a few chunks with their framing and
// payload shapes left intact. research-incomplete.sse is research.sse without
// its <answer> chunk.
const fixture = (file: string) =>
  readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');

const sse = (body: string) =>
  new Response(body, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8' },
  });

const K2_ANSWER =
  '**K2** is the second highest mountain in the world, standing at **8,611 meters (28,251 feet)** above sea level.';

// Each test asks a question naming the upstream response it should receive.
const upstream: Record<string, () => Response> = {
  'single-search': () => sse(fixture('single-search.sse')),
  truncated: () =>
    sse(fixture('single-search.sse').replace('"finish_reason":"stop"', '"finish_reason":"length"')),
  citations: () => sse(fixture('citations.sse')),
  research: () => sse(fixture('research.sse')),
  'research-incomplete': () => sse(fixture('research-incomplete.sse')),
  'api-error': () =>
    new Response(fixture('error-research-citations.json'), {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'content-type': 'application/json' },
    }),
};

const ask = (query: string) => ({ query });

const textOf = (result: Record<string, unknown>) =>
  (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

describe(name, () => {
  const requests: Record<string, unknown>[] = [];

  const getClient = useTestClient((url, init) => {
    if (url.pathname !== '/res/v1/chat/completions') return undefined;

    const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
    requests.push(body);
    return upstream[body.messages[0].content]?.();
  });

  it('returns a single-search answer without usage metadata', async () => {
    const result = await getClient().callTool({ name, arguments: ask('single-search') });

    assert.equal(result.isError, false, textOf(result));
    assert.equal(textOf(result), K2_ANSWER);
  });

  it('notes an answer cut off at the completion token limit', async () => {
    const result = await getClient().callTool({ name, arguments: ask('truncated') });
    const text = textOf(result);

    assert.equal(result.isError, false, text);
    assert.ok(text.startsWith(`${K2_ANSWER}\n\n`), text);
    assert.match(text, /\n\nNote: This answer was cut off at the completion token limit\./);
  });

  it('forwards options and sends the query as the single user message', async () => {
    await getClient().callTool({
      name,
      arguments: { ...ask('single-search'), enable_citations: true, country: 'US' },
    });

    // Exact, so the query field and an unset model never reach the API.
    assert.deepEqual(requests.at(-1), {
      enable_citations: true,
      country: 'US',
      messages: [{ role: 'user', content: 'single-search' }],
      stream: true,
    });
  });

  it('sends progress notifications while waiting for the answer', async () => {
    const progress: unknown[] = [];
    const result = await getClient().callTool(
      { name, arguments: ask('single-search') },
      undefined,
      {
        onprogress: (notification) => progress.push(notification),
      }
    );

    assert.equal(result.isError, false, textOf(result));
    assert.equal(progress.length, 1);
  });

  // Footnote structure is covered in format.test.ts; this checks the tool renders it.
  it('renders citations as markdown footnotes', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { ...ask('citations'), enable_citations: true },
    });
    const text = textOf(result);

    assert.equal(result.isError, false, text);
    assert.doesNotMatch(text, /<citation>|<usage>/);
    assert.match(text, /\*\*11 times\*\* as of mid-2026\.\[\^1\]/);
    assert.match(
      text,
      /\n\[\^1\]: \[energy-solutions\.co\]\(https:\/\/energy-solutions\.co\/articles\/sub\/fusion-energy-breakthroughs-2026\) — /
    );
  });

  it('returns only the synthesized research answer', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { ...ask('research'), enable_research: true },
    });
    const text = textOf(result);

    assert.equal(result.isError, false, text);
    assert.match(text, /^Tokamak and stellarator are two primary designs/);
    assert.match(text, /\n### 1\. Geometry and Magnetic Field Generation\n/);
    assert.doesNotMatch(text, /<\w+>/);
  });

  it('reports research that ends without an answer', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { ...ask('research-incomplete'), enable_research: true },
    });

    assert.equal(result.isError, true);
    assert.match(textOf(result), /^Research did not complete/);
  });

  it("passes the API's validation errors through", async () => {
    const result = await getClient().callTool({
      name,
      arguments: { ...ask('api-error'), enable_research: true, enable_citations: true },
    });

    assert.equal(result.isError, true);
    assert.match(textOf(result), /^422 Unprocessable Entity\n/);
    assert.match(textOf(result), /Research mode doesn't support 'enable_citations' option/);
  });

  it('rejects a missing query before calling the API', async () => {
    const before = requests.length;
    const result = await getClient().callTool({ name, arguments: {} });

    assert.equal(result.isError, true);
    assert.equal(requests.length, before);
  });
});
