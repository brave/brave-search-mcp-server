import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { streamChatCompletion } from '../../BraveAPI/chatCompletions.js';
import { AnswersInputSchema, MAX_RESEARCH_SECONDS, type AnswersInput } from './schemas/input.js';
import { formatAnswer } from './format.js';

export const name = 'brave_answers';

const SINGLE_SEARCH_TIMEOUT_MS = 90_000;
// A minute of headroom above the largest research budget the API accepts.
const RESEARCH_TIMEOUT_MS = (MAX_RESEARCH_SECONDS + 60) * 1000;
const PROGRESS_INTERVAL_MS = 5_000;

const NO_ANSWER_MESSAGE = 'No answer content was returned by the Answers API.';
const INCOMPLETE_RESEARCH_MESSAGE =
  'Research did not complete with a synthesized answer. Try lowering research_maximum_number_of_iterations or increasing research_maximum_number_of_seconds.';
const TRUNCATED_ANSWER_NOTE =
  'Note: This answer was cut off at the completion token limit. Increase max_completion_tokens for a complete answer.';

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export const annotations: ToolAnnotations = {
  title: 'Brave Answers',
  readOnlyHint: true,
  // destructiveHint and idempotentHint are meaningful only when readOnlyHint is false.
  // https://modelcontextprotocol.io/specification/2026-07-28/schema#toolannotations
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const description = `
    Generates AI-grounded answers backed by real-time Brave Search using the Answers API. Returns the finished answer as markdown.

    Preferred replacement for brave_summarizer: Pass your question in query instead of chaining brave_web_search (summary: true) + brave_summarizer.

    When to use:
        - When you need a finished, web-grounded answer rather than raw search results
        - For quick factual Q&A with optional citations (enable_citations), returned as markdown footnotes
        - For deeper multi-search research on complex topics (enable_research)

    Two modes:
        - Single-search (default): Fast grounded answer from one search. Supports enable_citations.
        - Research (enable_research=true): Iterative multi-search synthesis. Slower; may take up to several minutes.

    Requires an Answers plan. See https://api-dashboard.search.brave.com/app/subscriptions/subscribe
`.trim();

/**
 * Sends a progress notification now and every few seconds until stopped, so
 * clients that reset their request timeout on progress keep waiting.
 */
function startProgressPings(extra: ToolExtra): () => void {
  const progressToken = extra._meta?.progressToken;
  if (progressToken === undefined) return () => {};

  let progress = 0;
  const ping = () => {
    progress += 1;
    // Runs on a timer, so a rejection here would be unhandled and stop the process.
    extra
      .sendNotification({
        method: 'notifications/progress',
        params: { progressToken, progress, message: 'Waiting for answer…' },
      })
      .catch(() => {});
  };

  ping();
  const interval = setInterval(ping, PROGRESS_INTERVAL_MS);
  return () => clearInterval(interval);
}

export const execute = async (params: AnswersInput, extra: ToolExtra): Promise<CallToolResult> => {
  const stopProgressPings = startProgressPings(extra);
  const { query, ...options } = params;
  const research = params.enable_research === true;

  try {
    const { deltas, finishReason } = await streamChatCompletion(
      { ...options, messages: [{ role: 'user', content: query }] },
      {
        timeoutMs: research ? RESEARCH_TIMEOUT_MS : SINGLE_SEARCH_TIMEOUT_MS,
        signal: extra.signal,
      }
    );

    const answer = formatAnswer(deltas, { research });
    if (answer === null) {
      const message = research ? INCOMPLETE_RESEARCH_MESSAGE : NO_ANSWER_MESSAGE;
      return { content: [{ type: 'text', text: message }], isError: true };
    }

    const text = finishReason === 'length' ? `${answer}\n\n${TRUNCATED_ANSWER_NOTE}` : answer;
    return { content: [{ type: 'text', text }], isError: false };
  } finally {
    stopProgressPings();
  }
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: AnswersInputSchema,
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
