import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import config from '../config.js';
import { registerSigIntHandler } from '../helpers.js';
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

const isListToolsRequest = (value: unknown): value is ListToolsRequest =>
  ListToolsRequestSchema.safeParse(value).success;

type ResolvedTransport = {
  transport: StreamableHTTPServerTransport;
  // One-shot transports (stateless / bare tools/list) are not kept in `transports`.
  ephemeral: boolean;
};

const getTransport = async (request: Request): Promise<ResolvedTransport> => {
  // Check for an existing session
  const sessionId = request.headers['mcp-session-id'] as string;

  if (sessionId && transports.has(sessionId)) {
    return { transport: transports.get(sessionId)!, ephemeral: false };
  }

  // We have a special case where we'll permit ListToolsRequest w/o a session ID
  if (!sessionId && isListToolsRequest(request.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    return { transport, ephemeral: true };
  }

  let transport: StreamableHTTPServerTransport;
  let ephemeral = false;

  if (config.stateless) {
    // Some contexts (e.g. AgentCore) may prefer or require a stateless transport
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    ephemeral = true;
  } else {
    // Otherwise, start a new transport/session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
      },
      onsessionclosed: (id) => {
        transports.delete(id);
      },
    });
  }

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
  return { transport, ephemeral };
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
    let ephemeral = false;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      ({ transport, ephemeral } = await getTransport(req));
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        yieldGenericServerError(res);
      }
    } finally {
      if (ephemeral && transport) {
        await transport.close().catch(() => undefined);
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

  registerSigIntHandler(transports);

  const app = createApp();

  app.listen(config.port, config.host, () => {
    console.log(`Server is running on http://${config.host}:${config.port}/mcp`);
  });
};

export default { start, createApp };
