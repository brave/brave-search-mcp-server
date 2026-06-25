/**
 * Parses Server-Sent Events (SSE) text and extracts streamed chat completion content.
 *
 * Brave Answers returns OpenAI-compatible `data: {...}` lines with
 * `choices[0].delta.content` chunks, terminated by `data: [DONE]`.
 */
export function extractContentFromSseText(sseText: string): string {
  let content = '';

  for (const line of sseText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const data = trimmed.slice(5).trim();
    if (data.length === 0 || data === '[DONE]') continue;

    try {
      const chunk = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') {
        content += delta;
      }
    } catch {
      // Skip malformed SSE payloads.
    }
  }

  return content;
}

export async function consumeSseResponse(response: Response): Promise<string> {
  if (!response.body) {
    throw new Error('Streaming response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (data.length === 0 || data === '[DONE]') continue;

      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          content += delta;
        }
      } catch {
        // Skip malformed SSE payloads.
      }
    }
  }

  if (buffer.length > 0) {
    content += extractContentFromSseText(buffer);
  }

  return content;
}
