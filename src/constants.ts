export const RATE_LIMIT = {
  perSecond: 1,
  perMonth: 15000,
} as const;

/**
 * Limits applied at the HTTP edge, before a request reaches the MCP SDK.
 *
 * `maxBatchSize` bounds how many tool calls a single HTTP request can dispatch.
 * `maxBodySize` is an explicit parser cap rather than an inherited default, so
 * the bound is a stated decision instead of a side effect of body-parser's
 * 100kb default.
 */
export const HTTP_LIMITS = {
  maxBatchSize: 10,
  maxBodySize: '64kb',
} as const;

/**
 * Polling behavior for the (async) Summarizer endpoint. `pollIntervalMs` is the
 * delay between attempts; `pollAttempts` is the hard ceiling on outbound
 * requests per tool call.
 */
export const SUMMARIZER_POLL = {
  pollIntervalMs: 50,
  pollAttempts: 20,
} as const;
