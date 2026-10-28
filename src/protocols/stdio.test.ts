import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import tools from '../tools/index.js';

const entrypoint = fileURLToPath(new URL('../index.ts', import.meta.url));

/**
 * Spawns the real CLI over stdio, covering argument parsing, server wiring, and
 * JSON-RPC framing. Runs the source through tsx, so `npm test` needs no build.
 *
 * `tools/list` keeps this hermetic: it reaches the API client without issuing a
 * request.
 */
describe('stdio transport (real child process)', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let stderr = '';

  before(async () => {
    transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--import', 'tsx', entrypoint],
      // Startup requires a key.
      env: { ...getDefaultEnvironment(), BRAVE_API_KEY: 'test-key' },
      stderr: 'pipe',
    });

    transport.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    client = new Client({ name: 'stdio-test-client', version: '0.0.0' });
    await client.connect(transport);
  });

  after(async () => {
    await client.close();
  });

  it('serves the registered tools over stdin/stdout', async () => {
    const { tools: listedTools } = await client.listTools();

    // Both sides read the same registry; guard against an empty one.
    assert.ok(listedTools.length > 0, stderr);
    assert.deepEqual(
      listedTools.map((tool) => tool.name).sort(),
      Object.values(tools)
        .map((tool) => tool.name)
        .sort(),
      stderr
    );
  });
});
