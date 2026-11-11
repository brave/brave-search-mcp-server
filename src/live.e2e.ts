import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { after, before, describe, it, type TestContext } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv-provider.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import createMcpServer from './server.js';
import { expectedToolNames, toolNames } from './testUtils/mcpTestHarness.js';
import { name as imageSearch } from './tools/images/index.js';
import { name as llmContext } from './tools/llm_context/index.js';
import { name as localSearch } from './tools/local/index.js';
import { name as newsSearch } from './tools/news/index.js';
import { name as placeSearch } from './tools/place_search/index.js';
import { name as summarizer } from './tools/summarizer/index.js';
import { name as videoSearch } from './tools/videos/index.js';
import { name as webSearch } from './tools/web/index.js';

/**
 * Live tests against the real Brave Search API. Not part of `npm test`: run
 * `BRAVE_API_KEY=... npm run test:live`. Without a key, every test is skipped.
 *
 * Every tool is called through a real SDK client, which validates
 * structuredContent against the advertised output schema, so a schema that no
 * longer matches the API fails here. Output schemas are loose, so fields the
 * API returns but the schema does not declare pass validation; each test
 * reports those as diagnostics so schema drift is visible.
 *
 * Endpoints the key's plan does not include (402/403) are skipped, not failed.
 * Set BRAVE_LIVE_INTERVAL_MS to space out requests (default 1100ms, for the
 * free plan's 1 request/second limit).
 *
 * In GitHub Actions (GITHUB_STEP_SUMMARY set), drift, skips, and notes are
 * also written to the job summary. See .github/workflows/live.yml.
 */
const API_KEY = process.env.BRAVE_API_KEY;
const INTERVAL_MS = Number(process.env.BRAVE_LIVE_INTERVAL_MS ?? 1100);

/**
 * Connects an SDK client to a fresh server in memory. The client validates
 * structuredContent with JSON Schema 2020-12, the dialect the server
 * advertises (coordinates use 2020-12 `prefixItems`).
 */
async function connectClient(): Promise<Client> {
  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: 'live-test-client', version: '0.0.0' },
    {
      jsonSchemaValidator: new AjvJsonSchemaValidator(
        new Ajv2020({ strict: false, validateFormats: false })
      ),
    }
  );
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

let lastRequestAt = 0;
let client: Client;
let schemas: Map<string, Tool['outputSchema']>;

const drift = new Map<string, Set<string>>();
let driftChecks = 0;
const skipped: string[] = [];
const notes: string[] = [];

function skip(t: TestContext, reason: string) {
  skipped.push(`**${t.fullName}**: ${reason}`);
  t.skip(reason);
}

function note(t: TestContext, text: string) {
  notes.push(`**${t.fullName}**: ${text}`);
  t.diagnostic(text);
}

/** Writes drift, skips, and notes to the GitHub Actions job summary, if any. */
function writeJobSummary() {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;

  const code = (text: string) => `\`${text}\``;
  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');
  const sections = ['## Live Brave Search API'];

  if (driftChecks === 0) {
    sections.push('Schema drift was not checked: no response with structured output came back.');
  } else if (drift.size === 0) {
    sections.push(
      `No schema drift in ${driftChecks} response(s): every returned field is declared in its output schema.`
    );
  } else {
    const entries = [...drift].map(
      ([tool, paths]) => `${code(tool)}: ${[...paths].map(code).join(', ')}`
    );
    sections.push(
      `### Schema drift\n\nFields the API returned that the output schema does not declare:\n\n${list(entries)}`
    );
  }
  if (skipped.length > 0) sections.push(`### Skipped\n\n${list(skipped)}`);
  if (notes.length > 0) sections.push(`### Notes\n\n${list(notes)}`);

  appendFileSync(file, sections.join('\n\n') + '\n');
}

async function call(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const wait = lastRequestAt + INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  try {
    return (await client.callTool({ name, arguments: args })) as CallToolResult;
  } finally {
    lastRequestAt = Date.now();
  }
}

const texts = (result: CallToolResult): string[] =>
  result.content.flatMap((item) => (item.type === 'text' ? [item.text] : []));

/**
 * Calls a tool and asserts it succeeded. Skips the test when the key's plan
 * does not include the endpoint, or when rate limited.
 */
async function callOk(
  t: TestContext,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult | undefined> {
  const result = await call(name, args);
  const message = texts(result).join('\n');

  if (result.isError) {
    if (/^40[23] /m.test(message) || /OPTION_NOT_IN_PLAN|RESOURCE_NOT_ALLOWED/.test(message)) {
      skip(t, `${name} is not included in this key's plan: ${message.split('\n')[0]}`);
      return undefined;
    }
    if (/^429 /m.test(message)) {
      skip(t, `rate limited; raise BRAVE_LIVE_INTERVAL_MS: ${message.split('\n')[0]}`);
      return undefined;
    }
  }

  assert.equal(result.isError ?? false, false, message);
  assert.ok(result.content.length > 0, `${name} returned no content`);
  return result;
}

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  prefixItems?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
};

const hasType = (schema: JsonSchema, type: string): boolean =>
  schema.type === type || (Array.isArray(schema.type) && schema.type.includes(type));

/**
 * Collects the paths of object keys in `value` that `schema` does not declare,
 * e.g. `cities[].population`. Array indexes are collapsed to `[]`, and keys of
 * map-like objects (e.g. `sources`, keyed by URL) to `*`.
 */
function undeclaredPaths(schema: JsonSchema, value: unknown, path = '', out = new Set<string>()) {
  if (value === null || typeof value !== 'object') return out;

  const kind = Array.isArray(value) ? 'array' : 'object';
  const options = schema.anyOf ?? schema.oneOf ?? [schema];
  const match = options.find((option) => hasType(option, kind)) ?? schema;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemSchema = match.prefixItems?.[index] ?? match.items;
      if (itemSchema) undeclaredPaths(itemSchema, item, `${path}[]`, out);
    });
    return out;
  }

  // A non-empty additionalProperties schema describes a map's values (z.record);
  // an empty one ({}) is a loose object accepting anything undeclared.
  const additional = match.additionalProperties;
  const mapValues =
    typeof additional === 'object' && Object.keys(additional).length > 0 ? additional : undefined;

  for (const [key, child] of Object.entries(value)) {
    const childSchema = match.properties?.[key];
    if (childSchema) {
      undeclaredPaths(childSchema, child, path ? `${path}.${key}` : key, out);
    } else if (mapValues) {
      undeclaredPaths(mapValues, child, path ? `${path}.*` : '*', out);
    } else if (additional !== false) {
      out.add(path ? `${path}.${key}` : key);
    }
  }
  return out;
}

/** Reports structuredContent fields the advertised output schema does not declare. */
function reportDrift(t: TestContext, name: string, result: CallToolResult) {
  const schema = schemas.get(name);
  assert.ok(schema, `${name} advertises no output schema`);
  assert.ok(result.structuredContent, `${name} returned no structuredContent`);

  const paths = [...undeclaredPaths(schema as JsonSchema, result.structuredContent)].sort();
  driftChecks++;
  if (paths.length > 0) {
    const known = drift.get(name) ?? new Set<string>();
    for (const path of paths) known.add(path);
    drift.set(name, known);
    t.diagnostic(`${name}: ${paths.length} field(s) not declared in the output schema:`);
    for (const path of paths) t.diagnostic(`  ${path}`);
  }
}

/** Asserts each text item is a JSON object with the given string fields. */
function assertJsonResults(result: CallToolResult, fields: string[]) {
  for (const text of texts(result)) {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    for (const field of fields) {
      assert.equal(typeof parsed[field], 'string', `missing ${field} in ${text}`);
    }
  }
}

describe('live Brave Search API', { skip: !API_KEY && 'BRAVE_API_KEY is not set' }, () => {
  before(async () => {
    client = await connectClient();
    // Listing tools also loads the output schemas the client validates against.
    const { tools } = await client.listTools();
    assert.deepEqual(toolNames(tools), expectedToolNames);
    schemas = new Map(tools.map((tool) => [tool.name, tool.outputSchema]));
  });

  after(async () => {
    await client?.close();
    writeJobSummary();
  });

  it(webSearch, async (t) => {
    const result = await callOk(t, webSearch, { query: 'brave search api', count: 5 });
    if (result) assertJsonResults(result, ['url', 'title']);
  });

  it(newsSearch, async (t) => {
    const result = await callOk(t, newsSearch, { query: 'technology', count: 5 });
    if (result) assertJsonResults(result, ['url', 'title']);
  });

  it(videoSearch, async (t) => {
    const result = await callOk(t, videoSearch, { query: 'how to bake bread', count: 5 });
    if (result) assertJsonResults(result, ['url', 'title']);
  });

  it(imageSearch, async (t) => {
    const result = await callOk(t, imageSearch, { query: 'golden gate bridge', count: 5 });
    if (!result) return;
    reportDrift(t, imageSearch, result);
    assert.ok((result.structuredContent?.count as number) > 0, 'no images returned');
  });

  it(localSearch, async (t) => {
    const result = await callOk(t, localSearch, { query: 'coffee shops in San Francisco' });
    if (!result) return;
    const [first] = texts(result);
    if (first?.startsWith('No location data was returned')) {
      note(t, 'no local results; the tool fell back to web search (plan may lack Local API)');
    }
  });

  it(summarizer, async (t) => {
    const search = await callOk(t, webSearch, {
      query: 'what is the speed of light',
      summary: true,
    });
    if (!search) return;

    const key = texts(search)
      .find((text) => text.startsWith('Summarizer key: '))
      ?.slice('Summarizer key: '.length);
    if (!key) {
      skip(t, 'web search returned no summarizer key; the plan may not include Summarizer');
      return;
    }

    const result = await callOk(t, summarizer, { key });
    if (result) assert.ok(texts(result)[0]?.trim(), 'empty summary');
  });

  it(llmContext, async (t) => {
    const result = await callOk(t, llmContext, { query: 'how do vaccines work', count: 5 });
    if (result) reportDrift(t, llmContext, result);
  });

  describe(placeSearch, () => {
    const queries: Record<string, Record<string, unknown>> = {
      'POIs in a named area': { query: 'coffee', location: 'san francisco ca united states' },
      'POIs near coordinates': { query: 'pizza', latitude: 40.7128, longitude: -74.006 },
      'ambiguous city name': { query: 'springfield' },
      country: { query: 'portugal' },
      region: { query: 'tuscany' },
      neighborhood: { query: 'shibuya' },
      address: { query: '1600 amphitheatre parkway', latitude: 37.422, longitude: -122.084 },
    };

    for (const [label, args] of Object.entries(queries)) {
      it(label, async (t) => {
        const result = await callOk(t, placeSearch, args);
        if (!result) return;
        reportDrift(t, placeSearch, result);

        const populated = Object.entries(result.structuredContent ?? {})
          .filter(([, value]) => Array.isArray(value) && value.length > 0)
          .map(([key, value]) => `${key}(${(value as unknown[]).length})`);
        t.diagnostic(`populated: ${populated.join(', ') || 'none'}`);
      });
    }
  });
});
