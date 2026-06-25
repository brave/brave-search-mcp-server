import config from '../config.js';
import { stringify } from '../utils.js';
import { consumeSseResponse } from './sse.js';

const BASE_URL = 'https://api.search.brave.com';

const getDefaultRequestHeaders = (): Record<string, string> => {
  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    'Content-Type': 'application/json',
    'X-Subscription-Token': config.braveApiKey,
  };
};

async function buildErrorMessage(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;

  try {
    const responseBody = await response.json();
    errorMessage += `\n${stringify(responseBody, true)}`;
  } catch {
    errorMessage += `\n${await response.text()}`;
  }

  return errorMessage;
}

function mergeHeaders(requestHeaders: Record<string, string> = {}): Headers {
  const headers = new Headers(getDefaultRequestHeaders());
  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value === undefined || value === null) continue;
    headers.set(key, String(value));
  }
  return headers;
}

export async function issuePostRequest<T>(
  path: string,
  body: unknown,
  requestHeaders: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: mergeHeaders(requestHeaders),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function issueStreamingPostRequest(
  path: string,
  body: unknown,
  requestHeaders: Record<string, string> = {}
): Promise<string> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: mergeHeaders(requestHeaders),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response));
  }

  return consumeSseResponse(response);
}
