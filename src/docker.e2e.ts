import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  AGENTCORE_PORT,
  agentCoreEnvironment,
  agentCoreRpc,
  initializeParams,
} from './testUtils/agentCore.js';
import { expectedToolNames, toolNames } from './testUtils/mcpTestHarness.js';
import { name as webSearchToolName } from './tools/web/index.js';

/**
 * End-to-end tests for the container image, run the way each distribution
 * channel runs it. Not part of `npm test`: `npm run test:docker` builds the
 * image and runs these. To test an existing image (e.g. one pulled from Docker
 * Hub), set BRAVE_MCP_TEST_IMAGE and run this file directly.
 *
 * The API key is fake, so tool calls hit the real Brave API and come back as
 * error results; these tests assert the MCP round trip, not search results.
 */
const IMAGE = process.env.BRAVE_MCP_TEST_IMAGE ?? 'brave-search-mcp-server:test';
const LABEL = 'brave-search-mcp-server-e2e';
const API_KEY = 'test-key';

// The hardening flags from our documented `docker run` and compose usage.
const HARDENING = ['--read-only', '--cap-drop', 'all', '--security-opt', 'no-new-privileges'];

const execFileAsync = promisify(execFile);

const docker = async (...args: string[]): Promise<string> =>
  (await execFileAsync('docker', args)).stdout.trim();

const containerLogs = async (id: string): Promise<string> => {
  const { stdout, stderr } = await execFileAsync('docker', ['logs', id]);
  return stdout + stderr;
};

// Launches the image the way an MCP host does: `docker run -i` as a child
// process speaking JSON-RPC over stdin/stdout.
const connectStdio = async (dockerArgs: string[], env: Record<string, string> = {}) => {
  const transport = new StdioClientTransport({
    command: 'docker',
    args: ['run', '--interactive', '--rm', '--label', LABEL, ...dockerArgs, IMAGE],
    env: { ...(process.env as Record<string, string>), ...env },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'docker-e2e', version: '0.0.0' });
  await client.connect(transport);
  return client;
};

// Starts a detached HTTP container on a random loopback port and resolves once
// it answers /ping.
const startHttpContainer = async (
  env: Record<string, string>,
  containerPort: number
): Promise<string> => {
  const envArgs = Object.entries(env).flatMap(([name, value]) => ['--env', `${name}=${value}`]);
  const id = await docker(
    'run',
    '--detach',
    '--label',
    LABEL,
    ...HARDENING,
    '--publish',
    `127.0.0.1::${containerPort}`,
    ...envArgs,
    IMAGE
  );

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const [binding] = (await docker('port', id, `${containerPort}/tcp`)).split('\n');
      const baseUrl = `http://${binding}`;
      if ((await fetch(`${baseUrl}/ping`)).ok) return baseUrl;
    } catch {
      // Not listening yet (or exited; the logs below will say which).
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Container never answered /ping on ${containerPort}:\n${await containerLogs(id)}`
  );
};

after(async () => {
  const ids = await docker('ps', '--all', '--quiet', '--filter', `label=${LABEL}`);
  if (ids) await docker('rm', '--force', ...ids.split(/\s+/));
});

describe('stdio (Docker MCP Catalog, Claude Desktop, VS Code)', () => {
  it('serves tools via `docker run -i --rm -e BRAVE_API_KEY` as in the README', async () => {
    const client = await connectStdio(['--env', 'BRAVE_API_KEY'], { BRAVE_API_KEY: API_KEY });

    try {
      const { tools: listed } = await client.listTools();
      assert.deepEqual(toolNames(listed), expectedToolNames);
    } finally {
      await client.close();
    }
  });

  it('serves tool calls with the Docker MCP Catalog configuration', async () => {
    const client = await connectStdio([
      ...HARDENING,
      '--env',
      `BRAVE_API_KEY=${API_KEY}`,
      '--env',
      'BRAVE_MCP_TRANSPORT=stdio',
    ]);

    try {
      const result = await client.callTool({
        name: webSearchToolName,
        arguments: { query: 'brave' },
      });
      assert.ok(Array.isArray(result.content) && result.content.length > 0);
    } finally {
      await client.close();
    }
  });

  it('reads the API key from a mounted secret via BRAVE_API_KEY_FILE', async () => {
    const keyFile = join(mkdtempSync(join(tmpdir(), 'brave-api-key-')), 'brave_api_key');
    writeFileSync(keyFile, `${API_KEY}\n`);
    // The image runs as the unprivileged `node` user.
    chmodSync(keyFile, 0o644);

    const client = await connectStdio([
      ...HARDENING,
      '--mount',
      `type=bind,source=${keyFile},target=/run/secrets/brave_api_key,readonly`,
      '--env',
      'BRAVE_API_KEY_FILE=/run/secrets/brave_api_key',
    ]);

    try {
      const { tools: listed } = await client.listTools();
      assert.deepEqual(toolNames(listed), expectedToolNames);
    } finally {
      await client.close();
    }
  });
});

describe('HTTP (Docker Hub, docker compose, ECS/EKS)', () => {
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  before(async () => {
    // Relies on the image's own BRAVE_MCP_HOST=0.0.0.0 to be reachable.
    const baseUrl = await startHttpContainer(
      { BRAVE_API_KEY: API_KEY, BRAVE_MCP_TRANSPORT: 'http' },
      8080
    );
    transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    client = new Client({ name: 'docker-e2e', version: '0.0.0' });
    await client.connect(transport);
  });

  after(() => client?.close());

  it('serves tools/list and tools/call over a session on port 8080', async () => {
    assert.ok(transport.sessionId);

    const { tools: listed } = await client.listTools();
    assert.deepEqual(toolNames(listed), expectedToolNames);

    const result = await client.callTool({
      name: webSearchToolName,
      arguments: { query: 'brave' },
    });
    assert.ok(Array.isArray(result.content) && result.content.length > 0);
  });
});

describe('Amazon Bedrock AgentCore (AWS Marketplace listing defaults)', () => {
  let baseUrl: string;

  before(async () => {
    baseUrl = await startHttpContainer(
      { ...agentCoreEnvironment(), BRAVE_API_KEY: API_KEY },
      AGENTCORE_PORT
    );
  });

  it('accepts initialize carrying a platform-generated session id', async () => {
    const { status, body } = await agentCoreRpc(baseUrl, 1, 'initialize', initializeParams);

    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.result.serverInfo.name, 'brave-search-mcp-server');
  });

  it('serves tools/list with no prior initialize', async () => {
    const { status, body } = await agentCoreRpc(baseUrl, 2, 'tools/list');

    assert.equal(status, 200, JSON.stringify(body));
    assert.deepEqual(toolNames(body.result.tools), expectedToolNames);
  });

  it('serves tools/call with no prior initialize', async () => {
    const { status, body } = await agentCoreRpc(baseUrl, 3, 'tools/call', {
      name: webSearchToolName,
      arguments: { query: 'brave' },
    });

    assert.equal(status, 200, JSON.stringify(body));
    assert.ok(body.result.content.length > 0, JSON.stringify(body));
  });
});

describe('misconfiguration', () => {
  it('exits non-zero with a clear error when no API key is set', async () => {
    await assert.rejects(
      execFileAsync(
        'docker',
        ['run', '--rm', '--label', LABEL, '--env', 'BRAVE_MCP_TRANSPORT=http', IMAGE],
        { timeout: 30_000 }
      ),
      (error: { code?: number; stderr?: string }) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr ?? '', /API key is required/);
        return true;
      }
    );
  });
});
