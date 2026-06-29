import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

export type AnswersToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/** Default interval for MCP progress pings during long Answers streaming. */
export const ANSWERS_PROGRESS_INTERVAL_MS = 5_000;

export type AnswersProgressNotifierOptions = {
  /** Estimated progress steps (shown as progress/total when set). */
  totalSteps?: number;
};

/**
 * Builds a callback that sends MCP progress notifications while an Answers
 * request is in flight.
 *
 * Many MCP clients (including MCP Inspector) set maxTotalTimeout to ~60 seconds. Progress
 * resets the per-idle timeout but cannot extend past that hard cap — research
 * must finish within the host limit or use a lower research_maximum_number_of_seconds.
 * The MCP server itself allows at least 300s for research per Brave Answers guidance.
 */
export function createAnswersProgressNotifier(
  extra: AnswersToolExtra | undefined,
  message: string,
  options: AnswersProgressNotifierOptions = {}
): (() => Promise<void>) | undefined {
  const progressToken = extra?._meta?.progressToken;
  if (progressToken === undefined || extra === undefined) {
    return undefined;
  }

  let tick = 0;
  const { totalSteps } = options;

  return async () => {
    tick += 1;
    await extra.sendNotification({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress: tick,
        ...(totalSteps !== undefined ? { total: totalSteps } : {}),
        message,
      },
    });
  };
}
