import type { AnswersInput } from './schemas/input.js';

/** Brave docs recommend at least 30s for single-search Answers requests. */
const SINGLE_SEARCH_STREAM_TIMEOUT_MS = 90_000;

/** Default upstream research time budget when not specified. */
const RESEARCH_DEFAULT_BUDGET_SECONDS = 180;

/** Maximum allowed research_maximum_number_of_seconds per API. */
const RESEARCH_MAX_BUDGET_SECONDS = 300;

/**
 * Extra wall-clock time beyond the research budget for synthesis, streaming,
 * and network overhead before the MCP server aborts the request.
 */
const RESEARCH_POST_BUDGET_BUFFER_MS = 180_000;

export function getAnswersStreamingTimeoutMs(body: AnswersInput): number {
  if (body.enable_research) {
    const budgetSeconds = Math.min(
      body.research_maximum_number_of_seconds ?? RESEARCH_DEFAULT_BUDGET_SECONDS,
      RESEARCH_MAX_BUDGET_SECONDS
    );
    return budgetSeconds * 1000 + RESEARCH_POST_BUDGET_BUFFER_MS;
  }

  return SINGLE_SEARCH_STREAM_TIMEOUT_MS;
}
