import {
  AnswersNonStreamingResponseSchema,
  AnswersStreamingChunkSchema,
  type AnswersNonStreamingResponse,
  type AnswersStreamingChunk,
  type AnswersOutput,
  type Citation,
  type Usage,
} from './schemas/output.js';

import { classifyFragment, FragmentKind } from './fragments.js';

/**
 * Maps a fully-received non-streaming API response to the unified output shape.
 */
export function normalizeNonStreaming(response: AnswersNonStreamingResponse): AnswersOutput {
  const choice = response.choices[0];
  return {
    id: response.id,
    model: response.model,
    created: response.created,
    content: choice.message.content,
    finish_reason: choice.finish_reason,
    usage: response.usage,
  };
}

/**
 * Assembles an ordered array of streaming SSE chunks into the unified output
 * shape by concatenating delta content fragments (excluding Brave metadata
 * fragments) and taking usage from the final stop chunk.
 */
export function normalizeStreamingChunks(chunks: AnswersStreamingChunk[]): AnswersOutput {
  const first = chunks[0];
  if (!first) {
    return { id: '', model: '', created: 0, content: '', finish_reason: null, usage: null };
  }

  let content = '';
  let finish_reason: AnswersOutput['finish_reason'] = null;
  let usage: Usage | null = null;
  const citations: Citation[] = [];

  for (const chunk of chunks) {
    const choice = chunk.choices[0];
    if (!choice) continue;

    const fragment = classifyFragment(choice.delta.content);
    if (fragment.kind === FragmentKind.TEXT) {
      content += choice.delta.content;
    } else if (fragment.kind === FragmentKind.CITATION) {
      citations.push(fragment.data);
    } else if (fragment.kind === FragmentKind.USAGE) {
      // Ignore usage fragments from the content
      // We preserve usage from the final stop chunk
    }

    if (choice.finish_reason !== null) {
      finish_reason = choice.finish_reason;
    }

    if (chunk.usage !== null) {
      usage = chunk.usage;
    }
  }

  return {
    id: first.id,
    model: first.model,
    created: first.created,
    content,
    finish_reason,
    usage,
    ...(citations.length > 0 ? { citations } : {}),
  };
}

async function collectStreamingChunks(response: Response): Promise<AnswersStreamingChunk[]> {
  if (!response.body) {
    throw new Error('Streaming response has no readable body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: AnswersStreamingChunk[] = [];
  let buffer = '';
  let terminated = false;

  while (!terminated) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6); // Remove the 'data: ' prefix
      if (payload === '[DONE]') {
        terminated = true;
        break;
      }

      try {
        const result = AnswersStreamingChunkSchema.safeParse(JSON.parse(payload));
        if (result.success) {
          chunks.push(result.data);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  return chunks;
}

/**
 * Reads a raw fetch `Response` from the Answers endpoint and returns a
 * normalized `AnswersOutput`, handling both streaming (SSE) and non-streaming
 * JSON responses transparently.
 */
export async function assembleFromResponse(response: Response): Promise<AnswersOutput> {
  const contentType = response.headers.get('content-type') ?? '';

  // Streaming path
  if (contentType.includes('text/event-stream')) {
    const chunks = await collectStreamingChunks(response);
    return normalizeStreamingChunks(chunks);
  }

  // Non-streaming path
  const raw = await response.json();
  const parsed = AnswersNonStreamingResponseSchema.parse(raw);
  return normalizeNonStreaming(parsed);
}
