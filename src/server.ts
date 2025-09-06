import tools from './tools/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import pkg from '../package.json' with { type: 'json' };

import { type SmitheryConfig, setOptions } from './config.js';
export { configSchema } from './config.js';

type CreateMcpServerOptions = {
  config: SmitheryConfig;
};

export default function createMcpServer(options?: CreateMcpServerOptions): McpServer {
  if (options?.config) setOptions(options.config);

  const mcpServer = new McpServer(
    {
      version: pkg.version,
      name: 'brave-search-mcp-server',
      title: 'Brave Search MCP Server',
    },
    {
      capabilities: {
        logging: {},
        tools: { listChanged: false },
      },
      instructions: `Use this server to search the Web for various types of data via the Brave Search API.`,
    }
  );

  try {
    mcpServer.server.assertCanSetRequestHandler(SetLevelRequestSchema.shape.method.value);
    mcpServer.server.setRequestHandler(SetLevelRequestSchema, () => ({}));
  } catch (error) {
    /**
     * An error here signifies native-handling of the SetLevel request.
     * See https://github.com/modelcontextprotocol/typescript-sdk/issues/871.
     */
  }

  for (const tool of Object.values(tools)) {
    tool.register(mcpServer);
  }

  return mcpServer;
}
