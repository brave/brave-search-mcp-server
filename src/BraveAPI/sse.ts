import { EventSourceParserStream } from 'eventsource-parser/stream';

/**
 * Reads a streamed chat completion from a Server-Sent Events response.
 *
 * Brave Answers returns OpenAI-compatible events whose data is a JSON chunk
 * with `choices[0].delta.content`, terminated by a `[DONE]` event.
 */

type SseChunk = {
  choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
  error?: unknown;
};

export type StreamedChatCompletion = {
  /** Each delta's content, in order. */
  deltas: string[];
  /** The last `choices[0].finish_reason` reported, such as "stop" or "length". */
  finishReason?: string;
};

function describeError(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === 'string') return message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

/** The event's JSON chunk, or null for empty and malformed payloads. */
function parseChunk(data: string): SseChunk | null {
  try {
    return JSON.parse(data) as SseChunk | null;
  } catch {
    return null;
  }
}

/**
 * Reads the stream until the `[DONE]` event and returns each delta's content,
 * in order, with the reported finish reason. Throws if the stream ends before
 * [DONE] or sends an error event. Aborting the fetch that produced `response`
 * rejects the pending read with the abort reason.
 */
export async function readChatCompletionStream(
  response: Response
): Promise<StreamedChatCompletion> {
  if (!response.body) {
    throw new Error('Streaming response has no body');
  }

  const events = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());
  const deltas: string[] = [];
  let finishReason: string | undefined;

  // Leaving the loop cancels the stream, which the server may keep open after [DONE] or an error event.
  for await (const { data } of events) {
    if (data === '[DONE]') return { deltas, finishReason };

    const chunk = parseChunk(data);
    if (chunk?.error !== undefined && chunk.error !== null) {
      throw new Error(`Streaming response reported an error: ${describeError(chunk.error)}`);
    }

    const choice = chunk?.choices?.[0];
    const content = choice?.delta?.content;
    if (typeof content === 'string' && content.length > 0) {
      deltas.push(content);
    }
    if (typeof choice?.finish_reason === 'string') {
      finishReason = choice.finish_reason;
    }
  }

  throw new Error('Streaming response ended before completion');
}
