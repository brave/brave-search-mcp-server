import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import params, { type QueryParams } from './params.js';
import API from '../../BraveAPI/index.js';
import type {
  LlmContextApiResponse,
  LlmContextGroundingEntry,
  FormattedLlmContextResults,
} from './types.js';
import { stringify } from '../../utils.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const name = 'brave_llm_context';

export const annotations: ToolAnnotations = {
  title: 'Brave LLM Context',
  openWorldHint: true,
};

export const description = `
    Searches the web using the Brave LLM Context API and returns pre-extracted, LLM-optimized content including markdown text, structured data, code blocks, forum discussions, and YouTube captions.

    When to use:
        - When you need the actual page content for grounding LLM responses, not just URLs and snippets
        - For research requiring extracted text from multiple web pages
        - When building comprehensive answers that synthesize information from several sources
        - For fact-checking or verification tasks requiring source content
        - When you need structured, token-budgeted content from web searches

    When NOT to use (use brave_web_search instead):
        - When you only need URLs and brief descriptions
        - For simple navigational queries
        - When searching for images, videos, or news specifically
        - When you need location/business details (use brave_local_search)

    Returns a JSON list of grounding results with URL, title, and extracted text snippets from each source, along with source metadata.
`;

export const execute = async (params: QueryParams) => {
  const response = { content: [] as TextContent[], isError: false };
  const data = await API.issueRequest<'llmContext'>('llmContext', params);

  if (
    !data.grounding ||
    !Array.isArray(data.grounding.generic) ||
    data.grounding.generic.length < 1
  ) {
    response.isError = true;
    response.content.push({
      type: 'text' as const,
      text: 'No LLM context results found',
    });

    return response;
  }

  for (const entry of formatGroundingResults(data.grounding.generic)) {
    response.content.push({
      type: 'text' as const,
      text: stringify(entry),
    });
  }

  // Include source metadata if available
  if (data.sources && Object.keys(data.sources).length > 0) {
    response.content.push({
      type: 'text' as const,
      text: stringify({ sources: data.sources }),
    });
  }

  return response;
};

export const formatGroundingResults = (
  generic: LlmContextGroundingEntry[]
): FormattedLlmContextResults => {
  return (generic || []).map(({ url, title, snippets }) => ({
    url,
    title,
    snippets,
  }));
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: params.shape,
      annotations: annotations,
    },
    execute
  );
};

export default {
  name,
  description,
  annotations,
  inputSchema: params.shape,
  execute,
  register,
};
