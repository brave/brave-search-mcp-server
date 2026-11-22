import { BASE_URL, buildErrorMessage, mergeRequestHeaders } from './request.js';
import { readChatCompletionStream, type StreamedChatCompletion } from './sse.js';

const CHAT_COMPLETIONS_PATH = '/res/v1/chat/completions';

export type StreamChatCompletionOptions = {
  timeoutMs: number;
  /** Client cancellation signal, combined with the timeout. */
  signal?: AbortSignal;
};

/**
 * POSTs `body` to the Answers chat completions endpoint as a streaming
 * request and returns each streamed `choices[0].delta.content`, in order,
 * with the reported finish reason.
 */
export async function streamChatCompletion(
  body: Record<string, unknown>,
  { timeoutMs, signal: clientSignal }: StreamChatCompletionOptions
): Promise<StreamedChatCompletion> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = clientSignal ? AbortSignal.any([timeoutSignal, clientSignal]) : timeoutSignal;

  try {
    const response = await fetch(`${BASE_URL}${CHAT_COMPLETIONS_PATH}`, {
      method: 'POST',
      headers: mergeRequestHeaders({
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });

    if (!response.ok) {
      throw new Error(await buildErrorMessage(response));
    }

    return await readChatCompletionStream(response);
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new Error(`Streaming request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    if (clientSignal?.aborted) {
      throw new Error('Streaming request was cancelled');
    }
    throw error;
  }
}
