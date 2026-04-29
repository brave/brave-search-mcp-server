import type { Endpoints } from './types.js';
import config from '../config.js';
import { stringify } from '../utils.js';

const typeToPathMap: Record<keyof Endpoints, string> = {
  images: '/res/v1/images/search',
  localPois: '/res/v1/local/pois',
  localDescriptions: '/res/v1/local/descriptions',
  news: '/res/v1/news/search',
  videos: '/res/v1/videos/search',
  web: '/res/v1/web/search',
  summarizer: '/res/v1/summarizer/search',
  llmContext: '/res/v1/llm/context',
  placeSearch: '/res/v1/local/place_search',
};

const getDefaultRequestHeaders = (): Record<string, string> => {
  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': config.braveApiKey,
  };
};

const isValidGoggleURL = (url: string): boolean => {
  try {
    // Only allow HTTPS URLs
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeGoggle = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return isValidGoggleURL(trimmed) ? trimmed : null;
  }
  return trimmed;
};

async function issueRequest<T extends keyof Endpoints>(
  endpoint: T,
  parameters: Endpoints[T]['params'],
  requestHeaders: Endpoints[T]['requestHeaders'] = {} as Endpoints[T]['requestHeaders']
): Promise<Endpoints[T]['response']> {
  // TODO (Sampson): Improve rate-limit logic to support self-throttling and n-keys
  // checkRateLimit();

  // Determine URL, and setup parameters
  const url = new URL(`https://api.search.brave.com${typeToPathMap[endpoint]}`);
  const queryParams = new URLSearchParams();

  // TODO (Sampson): Move param-construction/validation to modules
  for (const [key, value] of Object.entries(parameters)) {
    // The 'ids' parameter is expected to appear multiple times for multiple IDs
    if (['localPois', 'localDescriptions'].includes(endpoint)) {
      if (key === 'ids') {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach((id) => queryParams.append(key, id));
        } else if (typeof value === 'string') {
          queryParams.set(key, value);
        }

        continue;
      }
    }

    // Handle `result_filter` parameter
    if (key === 'result_filter') {
      /**
       * Handle special behavior of 'summary' parameter:
       * When 'summary' is true, we need to either set result_filter to
       * 'summarizer', or leave it excluded entirely. This is due to a known
       * bug in the now-deprecated Summarizer endpoint. Setting it to
       * 'summarizer' will result in no web results being returned, which is
       * not ideal. As such, we skip the parameter entirely.
       * See https://github.com/brave/brave-search-mcp-server/issues/272 and
       * https://bravesoftware.slack.com/archives/C01NNFM9XMM/p1751654841090929
       */
      if ('summary' in parameters && parameters.summary === true) {
        continue;
      } else if (Array.isArray(value) && value.length > 0) {
        queryParams.set(key, value.join(','));
      }

      continue;
    }

    // Handle `goggles` parameter(s)
    if (key === 'goggles') {
      const candidates = Array.isArray(value) ? value : [value];
      for (const candidate of candidates) {
        const normalized = normalizeGoggle(candidate);
        if (normalized !== null) {
          queryParams.append(key, normalized);
        }
      }
      continue;
    }

    if (value !== undefined && value !== null) {
      queryParams.set(key === 'query' ? 'q' : key, value.toString());
    }
  }

  // Issue Request
  const urlWithParams = url.toString() + '?' + queryParams.toString();
  const headers = new Headers(getDefaultRequestHeaders());
  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value === undefined || value === null) continue;
    headers.set(key, String(value));
  }

  const response = await fetch(urlWithParams, { headers });

  // Handle Error
  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;

    try {
      const responseBody = await response.json();
      errorMessage += `\n${stringify(responseBody, true)}`;
    } catch (error) {
      errorMessage += `\n${await response.text()}`;
    }

    // TODO (Sampson): Setup proper error handling, updating state, etc.
    throw new Error(errorMessage);
  }

  // Return Response
  const responseBody = await response.json();

  return responseBody as Endpoints[T]['response'];
}

export default {
  issueRequest,
};
