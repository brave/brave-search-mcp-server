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
  /** Client cancellation signal (merged with the streaming timeout). */
  signal?: AbortSignal;
  /** Called periodically while the stream is open to keep MCP clients alive. */
  onProgress?: () => void | Promise<void>;
  progressIntervalMs?: number;
};

const DEFAULT_STREAMING_TIMEOUT_MS = 90_000;
const DEFAULT_PROGRESS_INTERVAL_MS = 5_000;

function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const active = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  if (active.length === 0) {
    return AbortSignal.timeout(DEFAULT_STREAMING_TIMEOUT_MS);
  }
  if (active.length === 1) {
    return active[0];
  }
  return AbortSignal.any(active);
}

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
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = mergeAbortSignals(timeoutSignal, options.signal);

  let progressInterval: ReturnType<typeof setInterval> | undefined;

  if (options.onProgress) {
    const intervalMs = options.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS;
    void options.onProgress();
    progressInterval = setInterval(() => {
      void options.onProgress?.();
    }, intervalMs);
  }

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
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}
