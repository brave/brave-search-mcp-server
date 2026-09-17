import assert from 'node:assert/strict';
import { type AddressInfo } from 'node:net';
import { type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import config from '../config.js';
import httpServer, { activeSessionCount } from './http.js';

describe('http session lifecycle', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    config.braveApiKey ||= 'test-key';
    server = httpServer.createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  });

  after(
    () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())))
  );

  const connect = async () => {
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
    const client = new Client({ name: 'session-test', version: '0.0.0' });
    await client.connect(transport);
    return { client, transport };
  };

  it('retains one session per initialized client and releases it on termination', async () => {
    const before = activeSessionCount();
    const { client, transport } = await connect();

    assert.equal(activeSessionCount(), before + 1, 'initialize should register a session');

    // A client DELETE ends the session; the server must drop its transport.
    await transport.terminateSession();
    await client.close();

    assert.equal(activeSessionCount(), before, 'terminated session should be released');
  });

  it('does not retain a session for a session-less tools/list probe', async () => {
    const before = activeSessionCount();

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    await res.text();

    assert.equal(res.status, 200);
    assert.equal(activeSessionCount(), before, 'the probe is served without a session');
  });

  it('serves stateless mode without issuing or retaining a session', async () => {
    const before = activeSessionCount();
    const originalStateless = config.stateless;
    config.stateless = true;

    try {
      const post = (body: unknown) =>
        fetch(baseUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify(body),
        });

      const init = await post({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'stateless-test', version: '0.0.0' },
        },
      });
      await init.text();

      assert.equal(init.status, 200);
      assert.equal(init.headers.get('mcp-session-id'), null, 'stateless mode issues no session id');

      // No session to carry, so this gets its own transport.
      const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      const listBody = await list.text();

      assert.equal(list.status, 200);
      assert.match(listBody, /brave_web_search/);
      assert.equal(activeSessionCount(), before, 'stateless requests retain nothing');
    } finally {
      config.stateless = originalStateless;
    }
  });

  it('rejects an unrecognized session id with 404', async () => {
    const post = (body: unknown) =>
      fetch(baseUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-session-id': 'expired-or-bogus',
        },
        body: JSON.stringify(body),
      });

    // The spec requires 404 so the client starts a new session. An `initialize`
    // must not be answered by quietly minting one under a different id.
    const init = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'stale-test', version: '0.0.0' },
      },
    });
    await init.text();

    assert.equal(init.status, 404);
    assert.equal(init.headers.get('mcp-session-id'), null);

    const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    assert.equal(list.status, 404);
    assert.deepEqual(JSON.parse(await list.text()), {
      id: null,
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Session not found' },
    });
  });

  it('releases every session once its client terminates', async () => {
    const before = activeSessionCount();
    const connections = await Promise.all([connect(), connect(), connect()]);

    assert.equal(activeSessionCount(), before + 3);

    for (const { client, transport } of connections) {
      await transport.terminateSession();
      await client.close();
    }

    assert.equal(activeSessionCount(), before);
  });
});
