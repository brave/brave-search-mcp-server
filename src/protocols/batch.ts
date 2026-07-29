import type { NextFunction, Request, RequestHandler, Response } from 'express';

// 400 with a JSON-RPC error and no id, per the MCP Streamable HTTP spec.
const sendBadRequest = (res: Response, message: string): void => {
  res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message }, id: null });
};

/**
 * Builds Express middleware that caps the number of messages in a JSON-RPC
 * batch before the request reaches the MCP SDK.
 *
 * The SDK accepts batch arrays of any length, and every message in a batch can
 * dispatch its own tool call, so one accepted HTTP request can fan out into an
 * unbounded number of outbound Brave Search API calls. Capping the array length
 * bounds that fan-out at the edge, independent of body size.
 *
 * Non-array bodies (the common single-message case) pass straight through.
 */
export const createBatchLimitGuard = (options: { maxBatchSize: number }): RequestHandler => {
  const { maxBatchSize } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (Array.isArray(req.body) && req.body.length > maxBatchSize) {
      sendBadRequest(res, `Batch size exceeds the limit of ${maxBatchSize} messages`);
      return;
    }

    next();
  };
};
