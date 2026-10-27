import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import config from '../config.js';
import createMcpServer from '../server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequest, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createDnsRebindingGuard } from './rebinding.js';

const yieldGenericServerError = (res: Response) => {
  res.status(500).json({
    id: null,
    jsonrpc: '2.0',
    error: { code: -32603, message: 'Internal server error' },
  });
};

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  lastSeen: number;
  activeRequests: number;
};

const transports = new Map<string, SessionEntry>();

const SESSION_SWEEP_INTERVAL_MS = 60_000;
let sessionSweeper: NodeJS.Timeout | undefined;

// Evicts sessions idle longer than the configured TTL. Clients that
// disappear without sending DELETE would otherwise leak transports (and
// their McpServer instances) forever.
const sweepIdleSessions = () => {
  const cutoff = Date.now() - config.sessionTtlMs;
  for (const [sessionId, entry] of transports) {
    if (entry.activeRequests === 0 && entry.lastSeen < cutoff) {
      transports.delete(sessionId);
      void entry.transport.close();
    }
  }
};

// Long-running tool calls and standalone GET SSE streams keep a session
// busy; the idle period only starts once the response has closed.
const trackActiveRequest = (sessionId: string | undefined, res: Response) => {
  const entry = sessionId ? transports.get(sessionId) : undefined;
  if (!entry) {
    return;
  }
  entry.activeRequests++;
  entry.lastSeen = Date.now();
  res.once('close', () => {
    entry.activeRequests--;
    entry.lastSeen = Date.now();
  });
};

const startSessionSweeper = () => {
  if (sessionSweeper || config.sessionTtlMs <= 0) {
    return;
  }
  sessionSweeper = setInterval(sweepIdleSessions, SESSION_SWEEP_INTERVAL_MS);
  sessionSweeper.unref();
};

const isListToolsRequest = (value: unknown): value is ListToolsRequest =>
  ListToolsRequestSchema.safeParse(value).success;

const getTransport = async (request: Request): Promise<StreamableHTTPServerTransport> => {
  // Check for an existing session
  const sessionId = request.headers['mcp-session-id'] as string;

  if (sessionId) {
    const entry = transports.get(sessionId);
    if (entry) {
      entry.lastSeen = Date.now();
      return entry.transport;
    }
  }

  // We have a special case where we'll permit ListToolsRequest w/o a session ID
  if (!sessionId && isListToolsRequest(request.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    return transport;
  }

  let transport: StreamableHTTPServerTransport;

  if (config.stateless) {
    // Some contexts (e.g. AgentCore) may prefer or require a stateless transport
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
  } else {
    // Otherwise, start a new transport/session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, { transport, lastSeen: Date.now(), activeRequests: 0 });
      },
      onsessionclosed: (sessionId) => {
        transports.delete(sessionId);
      },
    });
    // onsessionclosed only fires on DELETE requests; this also covers the
    // transport closing for any other reason. Protocol.connect() chains
    // onclose handlers, so setting it before connect() is safe.
    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };
  }

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
  return transport;
};

const createApp = () => {
  const app = express();

  app.use(
    '/mcp',
    createDnsRebindingGuard({
      allowedHosts: config.allowedHosts,
      allowedOrigins: config.allowedOrigins,
    })
  );

  app.use('/mcp', express.json());

  startSessionSweeper();

  app.all('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = await getTransport(req);
      trackActiveRequest(req.headers['mcp-session-id'] as string | undefined, res);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        yieldGenericServerError(res);
      }
    }
  });

  app.all('/ping', (req: Request, res: Response) => {
    res.status(200).json({ message: 'pong' });
  });

  return app;
};

const start = () => {
  if (!config.ready) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, config.host);

  server.on('listening', () => {
    console.log(`Server is running on http://${config.host}:${config.port}/mcp`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    const detail =
      error.code === 'EADDRINUSE' ? `port ${config.port} is already in use` : error.message;
    console.error(`Unable to start HTTP server: ${detail}`);
    process.exit(1);
  });
};

export default { start, createApp, sweepIdleSessions };
