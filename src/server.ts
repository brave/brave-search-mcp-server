import tools from './tools/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json' with { type: 'json' };
import { isToolPermittedByUser } from './config.js';
import enforce2020Dialect from './jsonSchemaDialect.js';

export default function createMcpServer(): McpServer {
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

  for (const tool of Object.values(tools)) {
    // The user may have enabled/disabled this tool at runtime
    if (!isToolPermittedByUser(tool.name)) continue;
    tool.register(mcpServer);
  }

  // Advertise 2020-12 schemas; the SDK would otherwise emit draft-07
  enforce2020Dialect(mcpServer);

  return mcpServer;
}
