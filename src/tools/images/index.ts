import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import params, { type QueryParams } from './schemas/input.js';
import API from '../../BraveAPI/index.js';
import type { ImageResult } from './types.js';
import OutputSchema, { SimplifiedImageResultSchema } from './schemas/output.js';
import { z } from 'zod';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const name = 'brave_image_search';

export const annotations: ToolAnnotations = {
  title: 'Brave Image Search',
  openWorldHint: true,
};

export const description = `
    Performs an image search using the Brave Search API. Helpful for when you need pictures of people, places, things, graphic design ideas, art inspiration, and more. When relaying results in a markdown environment, it may be helpful to include images in the results (e.g., ![image.title](image.properties.url)).
`;

export const execute = async (params: QueryParams) => {
  const response = await API.issueRequest<'images'>('images', params);
  const items = response.results.map(simplifySchemaForLLM).filter((o) => o !== null);

  const structuredContent = OutputSchema.safeParse({
    type: 'object',
    items,
    count: items.length,
    might_be_offensive: response.extra.might_be_offensive,
  });

  const payload = structuredContent.success
    ? structuredContent.data
    : structuredContent.error.flatten();

  return {
    content: [{ type: 'text', text: JSON.stringify(payload) } as TextContent],
    isError: !structuredContent.success,
    structuredContent: payload,
  };
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: params.shape,
      outputSchema: OutputSchema.shape,
      annotations: annotations,
    },
    execute
  );
};

function simplifySchemaForLLM(
  result: ImageResult
): z.infer<typeof SimplifiedImageResultSchema> | null {
  const parsed = SimplifiedImageResultSchema.safeParse({
    title: result.title,
    url: result.url,
    page_fetched: result.page_fetched,
    confidence: result.confidence,
    properties: {
      url: result.properties?.url,
      width: result.properties?.width,
      height: result.properties?.height,
    },
  });

  return parsed.success ? parsed.data : null;
}

export default {
  name,
  description,
  annotations,
  inputSchema: params.shape,
  outputSchema: OutputSchema.shape,
  execute,
  register,
};
