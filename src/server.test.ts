import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
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
});
