import config from '../config.js';
import { stringify } from '../utils.js';

export const BASE_URL = 'https://api.search.brave.com';

function getDefaultRequestHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': config.braveApiKey,
  };
}

export async function buildErrorMessage(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;

  try {
    const responseBody = await response.json();
    errorMessage += `\n${stringify(responseBody, true)}`;
  } catch {
    errorMessage += `\n${await response.text()}`;
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
