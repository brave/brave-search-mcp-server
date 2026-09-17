import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http, { type Server } from 'node:http';
import net, { type AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import config from '../config.js';
import httpServer from './http.js';

// Raw HTTP client so we can set the Host header (fetch/undici forbids overriding it).
const rawRequest = (
  port: number,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'content-length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

describe('http Origin validation', () => {
  let server: Server;
  let baseUrl: string;
  let port: number;
  const originalAllowedOrigins = [...config.allowedOrigins];

  const post = (origin: string | undefined) =>
    fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });

  before(async () => {
    config.allowedOrigins = ['https://allowed.example'];
    const app = httpServer.createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    config.allowedOrigins = originalAllowedOrigins;
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it('rejects a disallowed browser Origin with 403 and a JSON-RPC error', async () => {
    const res = await post('https://evil.example');
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.deepEqual(body, {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Forbidden: invalid Origin' },
      id: null,
    });
  });

  it('allows loopback Origins', async () => {
    const res = await post('http://localhost:3000');
    await res.text();

    assert.notEqual(res.status, 403);
  });

  it('allows explicitly allow-listed Origins', async () => {
    const res = await post('https://allowed.example');
    await res.text();

    assert.notEqual(res.status, 403);
  });

  it('matches allow-listed Origins case-insensitively', async () => {
    const res = await post('https://ALLOWED.example');
    await res.text();

    assert.notEqual(res.status, 403);
  });

  it('matches allow-listed Origins ignoring the default port', async () => {
    const res = await post('https://allowed.example:443');
    await res.text();

    assert.notEqual(res.status, 403);
  });

  it('allows requests without an Origin header', async () => {
    const res = await post(undefined);
    await res.text();

    assert.notEqual(res.status, 403);
  });

  it('rejects a present but empty Origin header', async () => {
    const res = await rawRequest(port, { origin: '' });

    assert.equal(res.status, 403);
  });
});

describe('http Host validation (disabled by default)', () => {
  let server: Server;
  let port: number;

  before(async () => {
    const app = httpServer.createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    port = (server.address() as AddressInfo).port;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it('allows an arbitrary Host when allowedHosts is empty', async () => {
    const res = await rawRequest(port, { host: 'anything.example.com' });

    assert.notEqual(res.status, 403);
  });
});

describe('http Host validation (opt-in)', () => {
  let server: Server;
  let port: number;
  const originalAllowedHosts = [...config.allowedHosts];

  before(async () => {
    config.allowedHosts = ['allowed.example.com'];
    const app = httpServer.createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    port = (server.address() as AddressInfo).port;
  });

  after(async () => {
    config.allowedHosts = originalAllowedHosts;
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it('rejects a disallowed Host with 403 and a JSON-RPC error', async () => {
    const res = await rawRequest(port, { host: 'evil.example.com' });

    assert.equal(res.status, 403);
    assert.deepEqual(JSON.parse(res.body), {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Forbidden: invalid Host' },
      id: null,
    });
  });

  it('allows loopback Hosts', async () => {
    const res = await rawRequest(port, { host: `127.0.0.1:${port}` });

    assert.notEqual(res.status, 403);
  });

  it('allows explicitly allow-listed Hosts', async () => {
    const res = await rawRequest(port, { host: 'allowed.example.com' });

    assert.notEqual(res.status, 403);
  });

  it('allows an allow-listed Host regardless of port', async () => {
    const res = await rawRequest(port, { host: 'allowed.example.com:9999' });

    assert.notEqual(res.status, 403);
  });

  it('matches allow-listed Hosts case-insensitively', async () => {
    const res = await rawRequest(port, { host: 'ALLOWED.EXAMPLE.COM' });

    assert.notEqual(res.status, 403);
  });

  it('rejects a malformed bracketed IPv6 Host that spoofs loopback', async () => {
    const res = await rawRequest(port, { host: '[::1]evil.example.com' });

    assert.equal(res.status, 403);
  });

  it('rejects an allow-listed Host with a malformed (non-numeric) port', async () => {
    const res = await rawRequest(port, { host: 'allowed.example.com:80evil' });

    assert.equal(res.status, 403);
  });
});

const entrypoint = fileURLToPath(new URL('../index.ts', import.meta.url));

const STARTUP_HOST = '127.0.0.1';
const EXIT_TIMEOUT_MS = 15_000;

// `start()` exits the process on a bind failure, so drive it from a child.
// The host is pinned to match the blocker, since BRAVE_MCP_HOST would otherwise
// send the child to a different interface and let it bind.
const startServer = (port: number): Promise<{ code: number | null; out: string; err: string }> => {
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      entrypoint,
      '--transport',
      'http',
      '--host',
      STARTUP_HOST,
      '--port',
      String(port),
    ],
    { env: { ...process.env, BRAVE_API_KEY: 'test-key' } }
  );

  let out = '';
  let err = '';
  child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()));

  return new Promise((resolve, reject) => {
    // A child that never exits is the regression under test; fail rather than hang.
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Server did not exit within ${EXIT_TIMEOUT_MS}ms.\n${out}\n${err}`));
    }, EXIT_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
};

describe('HTTP transport startup', () => {
  let blocker: net.Server;
  let takenPort: number;

  before(async () => {
    blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, STARTUP_HOST, () => resolve()));
    takenPort = (blocker.address() as AddressInfo).port;
  });

  after(() => new Promise<void>((resolve) => blocker.close(() => resolve())));

  it('exits with an error when the port is already in use', async () => {
    const { code, out, err } = await startServer(takenPort);

    assert.equal(code, 1, err);
    assert.match(err, /already in use/);
    assert.doesNotMatch(out, /Server is running/);
  });
});
