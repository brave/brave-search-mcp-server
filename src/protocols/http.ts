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

const transports = new Map<string, StreamableHTTPServerTransport>();

// Test seam: the number of sessions currently retained.
export const activeSessionCount = (): number => transports.size;

const isListToolsRequest = (value: unknown): value is ListToolsRequest =>
  ListToolsRequestSchema.safeParse(value).success;

// A session-less transport serves exactly one request, so its lifetime is the
// response's.
const createEphemeralTransport = async (res: Response): Promise<StreamableHTTPServerTransport> => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = createMcpServer();

  await mcpServer.connect(transport);

  res.on('close', () => {
    void transport.close();
    void mcpServer.close();
  });

  return transport;
};

const createSessionTransport = async (): Promise<StreamableHTTPServerTransport> => {
  const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      transports.set(sessionId, transport);
    },
    onsessionclosed: (sessionId) => {
      transports.delete(sessionId);
    },
  });

  // Covers the endings that arrive without a client DELETE: dropped
  // connections and shutdown.
  transport.onclose = () => {
    if (transport.sessionId) transports.delete(transport.sessionId);
  };

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);

  return transport;
};

const getTransport = async (
  request: Request,
  res: Response
): Promise<StreamableHTTPServerTransport> => {
  // Check for an existing session
  const sessionId = request.headers['mcp-session-id'] as string;
  const existing = sessionId ? transports.get(sessionId) : undefined;

  if (existing) return existing;

  // Some contexts (e.g. AgentCore) may prefer or require a stateless transport.
  // We also have a special case where we'll permit ListToolsRequest w/o a session ID.
  if (config.stateless || (!sessionId && isListToolsRequest(request.body))) {
    return createEphemeralTransport(res);
  }

  return createSessionTransport();
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

  app.all('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = await getTransport(req, res);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        yieldGenericServerError(res);
      }
    }
  });

  app.all('/ping', (_req: Request, res: Response) => {
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

export default { start, createApp };
