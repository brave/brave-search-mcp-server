import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { connectTestClient } from './testUtils/mcpTestHarness.js';
import tools from './tools/index.js';

describe('MCP server <-> SDK Client wiring (in-memory)', () => {
  let client: Client;
  let close: () => Promise<void>;

  before(async () => {
    ({ client, close } = await connectTestClient());
  });

  after(() => close());

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
});
