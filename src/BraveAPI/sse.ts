/**
 * Parses Server-Sent Events (SSE) text and extracts streamed chat completion content.
 *
 * Brave Answers returns OpenAI-compatible `data: {...}` lines with
 * `choices[0].delta.content` chunks, terminated by `data: [DONE]`.
 */
function appendContentFromSseLine(line: string, content: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return content;

  const data = trimmed.slice(5).trim();
  if (data.length === 0 || data === '[DONE]') return content;

  try {
    const chunk = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') {
      return content + delta;
    }
  } catch {
    // Skip malformed SSE payloads.
  }

  return content;
}

export function extractContentFromSseText(sseText: string): string {
  let content = '';

  for (const line of sseText.split('\n')) {
    content = appendContentFromSseLine(line, content);
  }

  return content;
}

export async function consumeSseResponse(
  response: Response,
  signal?: AbortSignal
): Promise<string> {
  if (!response.body) {
    throw new Error('Streaming response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw signal.reason ?? new Error('Streaming response aborted');
    }
  };

  try {
    while (true) {
      throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        content = appendContentFromSseLine(line, content);
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (buffer.length > 0) {
    content = extractContentFromSseText(buffer);
  }

  return content;
}
