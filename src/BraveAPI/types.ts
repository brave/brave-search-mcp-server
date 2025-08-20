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

export interface RateLimitErrorResponse {
  type: 'ErrorResponse';
  error: {
    id: string;
    status: number;
    code: 'RATE_LIMITED';
    detail: string;
    meta: {
      plan: string;
      rate_limit: number;
      rate_current: number;
      quota_limit: number;
      quota_current: number;
      component: 'rate_limiter';
    };
  };
  time: number;
}

export type Endpoints = {
  web: {
    params: WebQueryParams;
    response: WebSearchApiResponse;
    requestHeaders: Headers;
  };
  images: {
    params: ImageQueryParams;
    response: ImageSearchApiResponse;
    requestHeaders: Headers;
  };
  videos: {
    params: VideoQueryParams;
    response: VideoSearchApiResponse;
    requestHeaders: Headers;
  };
  news: {
    params: NewsQueryParams;
    response: NewsSearchApiResponse;
    requestHeaders: Headers;
  };
  localPois: {
    params: LocalPoisParams;
    response: LocalPoiSearchApiResponse;
    requestHeaders: Headers;
  };
  localDescriptions: {
    params: LocalDescriptionsParams;
    response: LocalDescriptionsSearchApiResponse;
    requestHeaders: Headers;
  };
  summarizer: {
    params: SummarizerQueryParams;
    response: SummarizerSearchApiResponse;
    requestHeaders: Headers;
  };
};
