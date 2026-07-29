import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { HTTP_LIMITS } from '../constants.js';
import httpServer from './http.js';

const message = (id: number) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name: 'brave_summarizer', arguments: { key: 'x' } },
});

// Minimal well-formed messages, so a large batch stays under the body limit and
// is stopped by the batch cap rather than by the parser.
const minimal = (id: number) => ({ jsonrpc: '2.0', id, method: 'tools/call' });

const batch = (size: number, build: (id: number) => Record<string, unknown> = message) =>
  Array.from({ length: size }, (_, i) => build(i));

describe('http JSON-RPC batch limits', () => {
  let server: Server;
  let baseUrl: string;

  const post = (body: unknown) =>
    fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    });

  before(async () => {
    const app = httpServer.createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it('rejects a batch larger than the limit with 400 and a JSON-RPC error', async () => {
    const res = await post(batch(HTTP_LIMITS.maxBatchSize + 1));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.id, null);
    assert.equal(body.error.code, -32600);
  });

  it('rejects the 931-message batch from the amplification report', async () => {
    const body = batch(931, minimal);
    // Confirm the batch cap is doing the work here, not the parser limit.
    assert.ok(Buffer.byteLength(JSON.stringify(body)) < 64 * 1024);

    const res = await post(body);
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.match(json.error.message, /Batch size exceeds/);
  });

  it('passes a batch at exactly the limit through to the MCP SDK', async () => {
    const res = await post(batch(HTTP_LIMITS.maxBatchSize));
    const json = await res.json();

    // The SDK rejects a session-less tools/call on its own terms; what matters
    // is that the rejection is not ours.
    assert.doesNotMatch(JSON.stringify(json), /Batch size exceeds/);
  });

  it('leaves single (non-array) messages untouched', async () => {
    const res = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

    assert.notEqual(res.status, 400);
  });

  it('rejects a body over the configured parser limit with 413', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'x',
        params: { q: 'a'.repeat(70_000) },
      }),
    });

    assert.equal(res.status, 413);
  });
});
