import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { issuePostRequest, issueStreamingPostRequest } from '../../BraveAPI/post.js';
import { answersQueryParams, type AnswersQueryParams } from './params.js';
import type { AnswersRequestBody, ChatCompletionResponse } from './types.js';
import { formatAnswersContent, INCOMPLETE_RESEARCH_MESSAGE } from './format.js';

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

    Note: Citations, entities, and research mode require streaming on the upstream API. This MCP tool buffers the stream before returning. Research responses are reduced to the synthesized <answer> text; citation metadata tags are stripped from the returned text.

    Requires an Answers plan. See https://api-dashboard.search.brave.com/app/subscriptions/subscribe
`.trim();

export const buildAnswersRequestBody = (params: AnswersQueryParams): AnswersRequestBody => {
  const mustStream =
    params.enable_citations === true ||
    params.enable_research === true ||
    params.enable_entities === true;

  const body: AnswersRequestBody = {
    messages: [{ role: 'user', content: params.query }],
    model: params.model ?? 'brave',
    stream: mustStream,
  };

  if (params.country !== undefined) body.country = params.country;
  if (params.language !== undefined) body.language = params.language;
  if (params.safesearch !== undefined) body.safesearch = params.safesearch;
  if (params.max_completion_tokens !== undefined) {
    body.max_completion_tokens = params.max_completion_tokens;
  }
  if (params.enable_entities !== undefined) body.enable_entities = params.enable_entities;
  if (params.enable_citations !== undefined) body.enable_citations = params.enable_citations;
  if (params.enable_research !== undefined) body.enable_research = params.enable_research;
  if (params.research_allow_thinking !== undefined) {
    body.research_allow_thinking = params.research_allow_thinking;
  }
  if (params.research_maximum_number_of_tokens_per_query !== undefined) {
    body.research_maximum_number_of_tokens_per_query =
      params.research_maximum_number_of_tokens_per_query;
  }
  if (params.research_maximum_number_of_queries !== undefined) {
    body.research_maximum_number_of_queries = params.research_maximum_number_of_queries;
  }
  if (params.research_maximum_number_of_iterations !== undefined) {
    body.research_maximum_number_of_iterations = params.research_maximum_number_of_iterations;
  }
  if (params.research_maximum_number_of_seconds !== undefined) {
    body.research_maximum_number_of_seconds = params.research_maximum_number_of_seconds;
  }
  if (params.research_maximum_number_of_results_per_query !== undefined) {
    body.research_maximum_number_of_results_per_query =
      params.research_maximum_number_of_results_per_query;
  }
  if (params.web_search_options !== undefined) {
    body.web_search_options = params.web_search_options;
  }

  return body;
};

export const execute = async (params: AnswersQueryParams): Promise<CallToolResult> => {
  const response: CallToolResult = { content: [], isError: false };
  const body = buildAnswersRequestBody(params);

  try {
    let rawText = '';

    if (body.stream) {
      rawText = await issueStreamingPostRequest(ANSWERS_PATH, body);
    } else {
      const result = await issuePostRequest<ChatCompletionResponse>(ANSWERS_PATH, body);
      rawText = result.choices?.[0]?.message?.content ?? '';
    }

    const formatted = formatAnswersContent(rawText, {
      enable_research: params.enable_research === true,
      enable_citations: params.enable_citations === true,
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
      inputSchema: answersQueryParams.shape,
      annotations: annotations,
    },
    execute
  );
};

export default {
  name,
  description,
  annotations,
  inputSchema: answersQueryParams.shape,
  execute,
  register,
};
