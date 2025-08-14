
import type { Endpoints } from './types.js';
import config from '../config.js';
import { checkRateLimit, log, stringify } from '../utils.js';
import { parse as parseUrl } from 'node:url';

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

  await log('info', `Preparing to issue request to ${url.toString()}`);

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

  await log('debug', `Using parameters: ${queryParams.toString()}`);

  // Issue Request
  const urlWithParams = url.toString() + '?' + queryParams.toString();

  const headers = { ...defaultRequestHeaders, ...requestHeaders } as Headers;

  // --- NO_PROXY support ---
  // If a proxy is set (e.g., HTTP_PROXY/HTTPS_PROXY), but the host matches NO_PROXY, bypass the proxy.
  // undici/fetch does not handle NO_PROXY automatically in Node.js.
  // See: https://github.com/nodejs/undici/issues/2020
  let agent;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (noProxy) {
    const { hostname } = parseUrl(urlWithParams);
    const patterns = noProxy.split(',').map(s => s.trim()).filter(Boolean);
    const isNoProxy = patterns.some(pattern => {
      if (!hostname) return false;
      if (pattern === '*') return true;
      if (pattern === hostname) return true;
      if (pattern.startsWith('.') && hostname.endsWith(pattern)) return true;
      // IPv6/IPv4 exact match
      if (hostname.replace(/^\[|\]$/g, '') === pattern.replace(/^\[|\]$/g, '')) return true;
      return false;
    });
    if (isNoProxy) {
      // undici/fetch: pass agent: null to bypass proxy agent
      agent = null;
    }
  }

  const response = await fetch(urlWithParams, { headers, ...(agent !== undefined ? { agent } : {}) });

  await log('debug', `Received response from ${urlWithParams}`);

  // Handle Error
  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;

    try {
      const responseBody = await response.json();
      errorMessage += `\n${stringify(responseBody, true)}`;
    } catch (error) {
      errorMessage += `\n${await response.text()}`;
    }

    await log('error', errorMessage);

    // TODO (Sampson): Setup proper error handling, updating state, etc.
    throw new Error(errorMessage);
  }

  // Return Response
  const responseBody = await response.json();
  await log('debug', `Returning response: ${stringify(responseBody, true)}`);

  return responseBody as Endpoints[T]['response'];
}

export default {
  issueRequest,
};
