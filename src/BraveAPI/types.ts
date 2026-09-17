import type { QueryParams as WebQueryParams } from '../tools/web/params.js';
import type { QueryParams as ImageQueryParams } from '../tools/images/schemas/input.js';
import type { QueryParams as VideoQueryParams } from '../tools/videos/params.js';
import type { QueryParams as NewsQueryParams } from '../tools/news/params.js';
import type { LocalPoisParams, LocalDescriptionsParams } from '../tools/local/params.js';
import type { SummarizerQueryParams } from '../tools/summarizer/params.js';
import type { WebSearchApiResponse } from '../tools/web/types.js';
import type { SummarizerSearchApiResponse } from '../tools/summarizer/types.js';
import type { ImageSearchApiResponse } from '../tools/images/types.js';
import type { VideoSearchApiResponse } from '../tools/videos/types.js';
import type { NewsSearchApiResponse } from '../tools/news/types.js';
import type {
  LocalPoiSearchApiResponse,
  LocalDescriptionsSearchApiResponse,
} from '../tools/local/types.js';
import type { LlmQueryParams, LlmRequestHeaders } from '../tools/llm_context/schemas/input.js';
import type { LlmContextSearchApiResponse } from '../tools/llm_context/schemas/output.js';
import type {
  PlaceSearchQueryParams,
  PlaceSearchRequestHeaders,
} from '../tools/place_search/schemas/input.js';
import type { PlaceSearchApiResponse } from '../tools/place_search/schemas/output.js';

// `issueRequest` enumerates these with `Object.entries`, so a `Headers`
// instance would contribute nothing - this must stay a plain object.
export type RequestHeaders = Record<string, string | number | boolean | undefined>;

export type Endpoints = {
  web: {
    params: WebQueryParams;
    response: WebSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  images: {
    params: ImageQueryParams;
    response: ImageSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  videos: {
    params: VideoQueryParams;
    response: VideoSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  news: {
    params: NewsQueryParams;
    response: NewsSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  localPois: {
    params: LocalPoisParams;
    response: LocalPoiSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  localDescriptions: {
    params: LocalDescriptionsParams;
    response: LocalDescriptionsSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  summarizer: {
    params: SummarizerQueryParams;
    response: SummarizerSearchApiResponse;
    requestHeaders: RequestHeaders;
  };
  llmContext: {
    params: LlmQueryParams;
    response: LlmContextSearchApiResponse;
    requestHeaders: LlmRequestHeaders;
  };
  placeSearch: {
    params: PlaceSearchQueryParams;
    response: PlaceSearchApiResponse;
    requestHeaders: PlaceSearchRequestHeaders;
  };
};
