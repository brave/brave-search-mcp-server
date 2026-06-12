import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import config from '../../config.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AnswersInputSchema,
  RequestBodySchema,
  type AnswersInput as QueryParams,
} from './schemas/input.js';
import { AnswersOutputSchema } from './schemas/output.js';
import { assembleFromResponse } from './utils.js';

const ANSWERS_ENDPOINT = 'https://api.search.brave.com/res/v1/chat/completions';

export const name = 'brave_answers';

export const annotations: ToolAnnotations = {
  title: 'Brave Answers',
  openWorldHint: true,
};

export const description = `
    Returns AI-grounded answers to questions using Brave's Answers API.
`;

export const execute = async (params: QueryParams) => {
  const parsedParams = RequestBodySchema.parse(params);

  const apiKey = config.braveAnswersApiKey || config.braveApiKey;

  const response = await fetch(ANSWERS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Subscription-Token': apiKey,
    },
    body: JSON.stringify(parsedParams),
  });

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      errorMessage += `\n${JSON.stringify(body, null, 2)}`;
    } catch {
      errorMessage += `\n${await response.text()}`;
    }
    throw new Error(errorMessage);
  }

  const output = await assembleFromResponse(response);

  return {
    content: [{ type: 'text', text: output.content } as TextContent],
    isError: false,
    structuredContent: output,
  };
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: AnswersInputSchema.shape,
      outputSchema: AnswersOutputSchema.shape,
      annotations: annotations,
    },
    execute
  );
};

export default {
  name,
  description,
  annotations,
  inputSchema: AnswersInputSchema.shape,
  outputSchema: AnswersOutputSchema.shape,
  execute,
  register,
};
