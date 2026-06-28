import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { issuePostRequest, issueStreamingPostRequest } from '../../BraveAPI/index.js';
import { AnswersInputSchema, type AnswersInput } from './schemas/input.js';
import type { ChatCompletionResponse } from './schemas/output.js';
import { formatAnswersContent, INCOMPLETE_RESEARCH_MESSAGE } from './format.js';
import { getAnswersStreamingTimeoutMs } from './timeout.js';

export const name = 'brave_answers';

const ANSWERS_PATH = '/res/v1/chat/completions';

export const annotations: ToolAnnotations = {
  title: 'Brave Answers',
  openWorldHint: true,
};

export const description = `
    Generates AI-grounded answers backed by real-time Brave Search using the Answers API (OpenAI-compatible /chat/completions endpoint).

    When to use:
        - When you need a finished, web-grounded answer rather than raw search results
        - For quick factual Q&A with optional inline citations
        - For deeper multi-search research on complex topics (enable_research)
        - As a drop-in alternative to chaining web search + summarization

    Two upstream modes:
        - Single-search (default): Fast grounded answer from one search. Supports enable_citations.
        - Research (enable_research=true): Iterative multi-search synthesis. Slower; may take up to several minutes.

    Request parameters mirror the Answers API request body. Set stream=true to use Server-Sent Events; this MCP tool buffers streamed responses before returning. When enable_research is true, research responses are reduced to the synthesized <answer> text. When enable_entities is true, <enum_item> blocks are converted to markdown bullet lines. Citation metadata tags are stripped from the returned text when enable_citations is true.

    Requires an Answers plan. See https://api-dashboard.search.brave.com/app/subscriptions/subscribe
`.trim();

/** Drop optional object fields that MCP clients may send as `{}` but should not be forwarded. */
export function prepareAnswersRequestBody(body: AnswersInput): AnswersInput {
  const prepared: Record<string, unknown> = { ...body, stream: body.stream ?? true };

  for (const [key, value] of Object.entries(prepared)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      delete prepared[key];
    }
  }

  return prepared as AnswersInput;
}

export const execute = async (params: AnswersInput): Promise<CallToolResult> => {
  const response: CallToolResult = { content: [], isError: false };
  const body = prepareAnswersRequestBody(AnswersInputSchema.parse(params));

  try {
    let rawText = '';

    if (body.stream) {
      rawText = await issueStreamingPostRequest(
        ANSWERS_PATH,
        body,
        {},
        { timeoutMs: getAnswersStreamingTimeoutMs(body) }
      );
    } else {
      const result = await issuePostRequest<ChatCompletionResponse>(ANSWERS_PATH, body);
      rawText = result.choices?.[0]?.message?.content ?? '';
    }

    const formatted = formatAnswersContent(rawText, {
      enable_research: body.enable_research === true,
      enable_citations: body.enable_citations === true,
      enable_entities: body.enable_entities === true,
    });

    if (!formatted.ok) {
      response.isError = true;
      response.content.push({
        type: 'text',
        text:
          formatted.reason === 'incomplete_research'
            ? INCOMPLETE_RESEARCH_MESSAGE
            : 'No answer content was returned by the Answers API.',
      });
      return response;
    }

    response.content.push({
      type: 'text',
      text: formatted.text,
    });
  } catch (error) {
    response.isError = true;
    response.content.push({
      type: 'text',
      text: error instanceof Error ? error.message : String(error),
    });
  }

  return response;
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: AnswersInputSchema.shape,
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
  execute,
  register,
};
