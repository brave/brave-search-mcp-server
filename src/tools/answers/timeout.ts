import type { AnswersInput } from './schemas/input.js';

export const SINGLE_SEARCH_STREAM_TIMEOUT_MS = 90_000;
export const RESEARCH_STREAM_TIMEOUT_MS = 300_000;

export function getAnswersStreamingTimeoutMs(body: AnswersInput): number {
  return body.enable_research === true
    ? RESEARCH_STREAM_TIMEOUT_MS
    : SINGLE_SEARCH_STREAM_TIMEOUT_MS;
}
