import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { summarizerQueryParams, type SummarizerQueryParams } from './params.js';
import API, { BraveApiError } from '../../BraveAPI/index.js';
import { SUMMARIZER_POLL } from '../../constants.js';
import { type SummarizerSearchApiResponse } from './types.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const name = 'brave_summarizer';

export const annotations: ToolAnnotations = {
  title: 'Brave Summarizer',
  openWorldHint: true,
};

export const description = `
    Retrieves AI-generated summaries of web search results using Brave's Summarizer API. This tool processes search results to create concise, coherent summaries of information gathered from multiple sources.

    When to use:

    - When you need a concise overview of complex topics from multiple sources
    - For quick fact-checking or getting key points without reading full articles
    - When providing users with summarized information that synthesizes various perspectives
    - For research tasks requiring distilled information from web searches

    Returns a text summary that consolidates information from the search results. Optional features include inline references to source URLs and additional entity information.

    Requirements: Must first perform a web search using brave_web_search with summary=true parameter. Requires a Pro AI subscription to access the summarizer functionality.
`.trim();

export const execute = async (params: SummarizerQueryParams, extra?: { signal?: AbortSignal }) => {
  const response: CallToolResult = { content: [], isError: false };

  try {
    const { summary } = await pollForSummary(params, undefined, undefined, extra?.signal);

    if (!summary || summary.length === 0) {
      response.isError = true;
      response.content.push({
        type: 'text' as const,
        text: 'Unable to retrieve a Summarizer summary.',
      });
    } else {
      const summaryText = summary
        .map((summary_part) => {
          if (summary_part.type === 'token') {
            return summary_part.data;
          } else if (summary_part.type === 'inline_reference') {
            return ` (${summary_part.data?.url})`;
          } else {
            return '';
          }
        })
        .join('');

      response.content.push({
        type: 'text' as const,
        text: summaryText,
      });
    }
  } catch (error) {
    response.isError = true;
    response.content.push({
      type: 'text' as const,
      text: 'Unable to retrieve a Summarizer summary.',
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
      inputSchema: summarizerQueryParams.shape,
      annotations: annotations,
    },
    execute
  );
};

/**
 * A summary that is still being generated is worth waiting for; a request the
 * API has already rejected is not. Retry only on throttling (429) and upstream
 * failures (5xx). Every other status -- an invalid or unsubscribed key (401,
 * 403), a malformed request (422) -- is deterministic and will return the same
 * result on every attempt, so retrying it only multiplies outbound requests.
 *
 * Errors that are not BraveApiError (network faults, JSON parse failures) have
 * no status to judge and are treated as transient.
 */
export const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof BraveApiError)) return true;
  return error.status === 429 || error.status >= 500;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });

const pollForSummary = async (
  params: SummarizerQueryParams,
  pollInterval: number = SUMMARIZER_POLL.pollIntervalMs,
  attempts: number = SUMMARIZER_POLL.pollAttempts,
  signal?: AbortSignal
): Promise<SummarizerSearchApiResponse> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Wait between attempts, not before the first one. The previous
    // implementation only slept on the error path, so a well-formed response
    // that was not yet 'complete' re-polled immediately -- issuing all
    // remaining attempts back to back with no delay at all.
    if (attempt > 0) {
      await sleep(pollInterval, signal);
    }

    if (signal?.aborted) {
      throw signal.reason ?? new Error('Aborted');
    }

    try {
      const response = await API.issueRequest<'summarizer'>('summarizer', params);
      if (response.status === 'complete') {
        return response;
      }
    } catch (error) {
      // Stop immediately on a failure that repeating cannot resolve.
      if (!isRetryableError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Summarizer summary could not be retrieved after multiple attempts.');
};

export default {
  name,
  description,
  annotations,
  inputSchema: summarizerQueryParams.shape,
  execute,
  register,
};
