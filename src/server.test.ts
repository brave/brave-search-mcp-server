import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import config from './config.js';
import { connectTestClient } from './testUtils/mcpTestHarness.js';
import tools from './tools/index.js';

describe('MCP server <-> SDK Client wiring (in-memory)', () => {
  let client: Client;

  before(async () => {
    client = await connectTestClient();
  });

  after(() => client.close());

  it('lists every registered tool with a valid input schema', async () => {
    const { tools: listedTools } = await client.listTools();
    const expectedNames = Object.values(tools)
      .map((tool) => tool.name)
      .sort();

    assert.deepEqual(listedTools.map((tool) => tool.name).sort(), expectedNames);

    for (const tool of listedTools) {
      assert.ok(tool.inputSchema, `${tool.name} is missing an inputSchema`);
    }
  });

  it('advertises valid JSON Schema 2020-12 schemas', async () => {
    const { tools: listedTools } = await client.listTools();

    // Compiling resolves the declared dialect, so a draft-07 tag fails here as
    // readily as invalid 2020-12 keywords. The SDK does the Zod conversion, so
    // only the wire format is worth asserting.
    const ajv = new Ajv2020({ strict: false, validateFormats: false });

    for (const tool of listedTools) {
      assert.doesNotThrow(
        () => ajv.compile(tool.inputSchema),
        `${tool.name} has an invalid inputSchema`
      );

      const { outputSchema } = tool;

      if (outputSchema) {
        assert.doesNotThrow(
          () => ajv.compile(outputSchema),
          `${tool.name} has an invalid outputSchema`
        );
      }
    }
  });

  it('advertises additionalProperties in its portable boolean form', async () => {
    const { tools: listedTools } = await client.listTools();

    // Zod emits `{}` for every loose object; some clients misread it.
    // See advertisedSchemas.ts.
    const findEmpty = (node: unknown, path: string): string[] => {
      if (Array.isArray(node)) return node.flatMap((entry, i) => findEmpty(entry, `${path}[${i}]`));
      if (node === null || typeof node !== 'object') return [];

      return Object.entries(node).flatMap(([keyword, value]) => {
        const isEmpty =
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0;

        if (keyword === 'additionalProperties' && isEmpty) return [`${path}.${keyword}`];

        return findEmpty(value, `${path}.${keyword}`);
      });
    };

    const offenders = listedTools.flatMap((tool) => [
      ...findEmpty(tool.inputSchema, `${tool.name}.inputSchema`),
      ...findEmpty(tool.outputSchema, `${tool.name}.outputSchema`),
    ]);

    assert.deepEqual(offenders, [], `empty additionalProperties: ${offenders.join(', ')}`);
  });
});

describe('tool registration gating', () => {
  const original = { enabled: config.enabledTools, disabled: config.disabledTools };

  const listToolNames = async () => {
    const client = await connectTestClient();
    try {
      const { tools: listed } = await client.listTools();
      return listed.map((tool) => tool.name).sort();
    } finally {
      await client.close();
    }
  };

  afterEach(() => {
    config.enabledTools = original.enabled;
    config.disabledTools = original.disabled;
  });

  it('registers only the enabled tools', async () => {
    config.enabledTools = ['brave_web_search', 'brave_news_search'];
    config.disabledTools = [];

    assert.deepEqual(await listToolNames(), ['brave_news_search', 'brave_web_search']);
  });

  it('registers everything except the disabled tools', async () => {
    config.enabledTools = [];
    config.disabledTools = ['brave_summarizer'];

    const names = await listToolNames();

    assert.equal(names.includes('brave_summarizer'), false);
    assert.equal(names.length, Object.values(tools).length - 1);
  });

  it('registers every tool when neither list is set', async () => {
    config.enabledTools = [];
    config.disabledTools = [];

    assert.equal((await listToolNames()).length, Object.values(tools).length);
  });
});
