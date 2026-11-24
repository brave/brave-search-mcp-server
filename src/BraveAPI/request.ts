import config from '../config.js';
import { stringify } from '../utils.js';

export const BASE_URL = 'https://api.search.brave.com';

/** Upper bound on a (decoded) response body read into memory. */
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

function getDefaultRequestHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': config.braveApiKey,
  };
}

/** Reads the body as UTF-8 text, cancelling the stream once it exceeds `maxBytes`. */
export async function readTextCapped(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES
): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`Brave API response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function buildErrorMessage(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;

  try {
    const bodyText = await readTextCapped(response);
    if (bodyText.length === 0) {
      return errorMessage;
    }

    try {
      errorMessage += `\n${stringify(JSON.parse(bodyText), true)}`;
    } catch {
      errorMessage += `\n${bodyText}`;
    }
  } catch {
    // Body unavailable; status line only.
  }

  return errorMessage;
}

/** Layers request-specific headers over the defaults, skipping unset values. */
export function mergeRequestHeaders(
  requestHeaders: Record<string, string | number | undefined | null> = {}
): Headers {
  const headers = new Headers(getDefaultRequestHeaders());

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value === undefined || value === null) continue;
    headers.set(key, String(value));
  }
  return headers;
}
