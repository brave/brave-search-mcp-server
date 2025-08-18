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
};

const defaultRequestHeaders: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Encoding': 'gzip',
  'X-Subscription-Token': config.braveApiKey,
};

async function issueRequest<T extends keyof Endpoints>(
  endpoint: T,
  parameters: Endpoints[T]['params'],
  // TODO (Sampson): Implement support for custom request headers (helpful for POIs, etc.)
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

    // Handle result_filter parameter
    if (key === 'result_filter') {
      // Handle special behavior of 'summary' parameter:
      // Requires `result_filter` to be empty, or only contain 'summarizer'
      // see: https://bravesoftware.slack.com/archives/C01NNFM9XMM/p1751654841090929
      if ('summary' in parameters && parameters.summary === true) {
        queryParams.set(key, 'summarizer');
      } else if (Array.isArray(value) && value.length > 0) {
        queryParams.set(key, value.join(','));
      }

      continue;
    }

    // Handle goggles parameters
    if (key === 'goggles') {
      if (typeof value === 'string') {
        queryParams.set(key, value);
      } else if (Array.isArray(value) && value.length > 0) {
        queryParams.set(key, value.join(','));
      }

      continue;
    }

    if (value !== undefined) {
      queryParams.set(key === 'query' ? 'q' : key, value.toString());
    }
  }

  // Issue Request
  const urlWithParams = url.toString() + '?' + queryParams.toString();
  const headers = { ...defaultRequestHeaders, ...requestHeaders } as Headers;
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
