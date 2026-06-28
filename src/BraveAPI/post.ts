import { BASE_URL, buildErrorMessage, mergeRequestHeaders } from './request.js';
import { consumeSseResponse } from './sse.js';

export async function issuePostRequest<T>(
  path: string,
  body: unknown,
  requestHeaders: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: mergeRequestHeaders(requestHeaders, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response));
  }

  return (await response.json()) as T;
}

export type StreamingPostRequestOptions = {
  timeoutMs?: number;
};

const DEFAULT_STREAMING_TIMEOUT_MS = 90_000;

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export async function issueStreamingPostRequest(
  path: string,
  body: unknown,
  requestHeaders: Record<string, string> = {},
  options: StreamingPostRequestOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_STREAMING_TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: mergeRequestHeaders(requestHeaders, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(await buildErrorMessage(response));
    }

    return await consumeSseResponse(response, signal);
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`Streaming request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw error;
  }
}
