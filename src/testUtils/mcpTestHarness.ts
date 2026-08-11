import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { after, before } from 'node:test';
import createMcpServer from '../server.js';

/**
 * Connects a real SDK Client to a fresh McpServer over an in-memory transport
 * pair, so tests exercise the actual registerTool/callTool wiring instead of
 * invoking a tool's `execute` function directly.
 */
export async function connectTestClient(): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const mcpServer = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });

  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);

  return { client, close: () => client.close() };
}

/**
 * Replaces global.fetch with a stub that resolves requests via `handler`,
 * keyed on the request's pathname. Returns a restore function.
 */
export function stubFetch(handler: (url: URL) => unknown): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const body = handler(url);

    if (body === undefined) {
      throw new Error(`Unmocked Brave API request: ${url.pathname}`);
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

/**
 * Registers before/after hooks on the enclosing `describe` block that stub
 * the Brave API via `responder` and connect a fresh test client, tearing
 * both down afterward. Returns a getter for the connected client.
 */
export function useTestClient(responder: (url: URL) => unknown): () => Client {
  let client: Client;
  let close: () => Promise<void>;
  let restoreFetch: () => void;

  before(async () => {
    restoreFetch = stubFetch(responder);
    ({ client, close } = await connectTestClient());
  });

  after(async () => {
    restoreFetch();
    await close();
  });

  return () => client;
}
