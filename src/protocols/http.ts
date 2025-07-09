import express, { type Request, type Response } from 'express';
import config from '../config.js';
import { server } from '../server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const yieldGenericServerError = (res: Response) => {
  res.status(500).json({
    id: null,
    jsonrpc: '2.0',
    error: { code: -32603, message: 'Internal server error' },
  });
};

export const start = () => {
  if (!config.ready) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  const app = express();

  app.use(express.json());

  app.all('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        // Setting to undefined will opt-out of session-id generation
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        yieldGenericServerError(res);
      }
    }
  });

  app.all('/ping', (req: Request, res: Response) => {
    res.status(200).json({ message: 'pong' });
  });

  app.listen(config.port, config.host, () => {
    console.error(`Server is running on http://${config.host}:${config.port}/mcp`);
  });
};

export default { start };
