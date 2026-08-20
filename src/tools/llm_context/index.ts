import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import API from '../../BraveAPI/index.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  RequestParamsSchema,
  RequestHeadersSchema,
  LlmContextInputSchema,
  type LlmContextInput as QueryParams,
} from './schemas/input.js';
import { LlmContextSearchApiResponseSchema } from './schemas/output.js';

export const name = 'brave_llm_context';

export const annotations: ToolAnnotations = {
  title: 'Brave LLM Context',
  openWorldHint: true,
};

export const description = `
    Retrieves pre-extracted, relevance-ranked web content using Brave's LLM Context API, optimized for AI agents, LLM grounding, and RAG pipelines. Unlike a traditional web search that returns links and short descriptions, this tool returns the actual substance of matching pages — text chunks, tables, code blocks, and structured data — so the model can reason over it directly.

    When to use:
        - Grounding answers in fresh, relevant web content (RAG)
        - Giving an AI agent ready-to-use page content from a single search call
        - Question answering and fact-checking against current sources
        - Gathering source material for research without manually fetching pages
        - When you need the contents of pages, not just titles, descriptions, and URLs

    When relaying results in markdown-supporting environments, cite the source URLs from the "sources" map.
`.trim();

export const execute = async (params: QueryParams) => {
  const parsedParams = RequestParamsSchema.parse(params);
  const parsedHeaders = RequestHeadersSchema.parse(params);

  const response = await API.issueRequest<'llmContext'>('llmContext', parsedParams, parsedHeaders);
  const { success, data, error } = LlmContextSearchApiResponseSchema.safeParse(response);
  const payload = success ? data : z.treeifyError(error);

  return {
    content: [{ type: 'text', text: JSON.stringify(payload) } as TextContent],
    isError: !success,
    structuredContent: payload,
  };
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: LlmContextInputSchema,
      outputSchema: LlmContextSearchApiResponseSchema,
      annotations: annotations,
    },
    execute
  );
};

export default {
  name,
  description,
  annotations,
  inputSchema: LlmContextInputSchema.shape,
  outputSchema: LlmContextSearchApiResponseSchema.shape,
  execute,
  register,
};
