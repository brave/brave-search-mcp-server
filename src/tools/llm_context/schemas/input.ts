import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/summarizer/llm_context/get
 */

const CountryCodesSchema = z.enum([
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CL',
  'DK',
  'FI',
  'FR',
  'DE',
  'GR',
  'HK',
  'IN',
  'ID',
  'IT',
  'JP',
  'KR',
  'MY',
  'MX',
  'NL',
  'NZ',
  'NO',
  'CN',
  'PL',
  'PT',
  'PH',
  'RU',
  'SA',
  'ZA',
  'ES',
  'SE',
  'CH',
  'TW',
  'TR',
  'GB',
  'US',
  'ALL',
]);

const SearchLangCodesSchema = z.enum([
  'ar',
  'eu',
  'bn',
  'bg',
  'ca',
  'zh-hans',
  'zh-hant',
  'hr',
  'cs',
  'da',
  'nl',
  'en',
  'en-gb',
  'et',
  'fi',
  'fr',
  'gl',
  'de',
  'el',
  'gu',
  'he',
  'hi',
  'hu',
  'is',
  'it',
  'ja',
  'jp',
  'kn',
  'ko',
  'lv',
  'lt',
  'ms',
  'ml',
  'mr',
  'nb',
  'pl',
  'pt-br',
  'pt-pt',
  'pa',
  'ro',
  'ru',
  'sr',
  'sk',
  'sl',
  'es',
  'sv',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'vi',
]);

const FreshnessSchema = z
  .union([
    z.enum(['pd', 'pw', 'pm', 'py']),
    z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/,
        "Use 'pd', 'pw', 'pm', 'py', or a custom range as YYYY-MM-DDtoYYYY-MM-DD."
      ),
  ])
  .describe(
    "Filters search results by when they were discovered. The following values are supported: 'pd' - Discovered within the last 24 hours. 'pw' - Discovered within the last 7 days. 'pm' - Discovered within the last 31 days. 'py' - Discovered within the last 365 days. 'YYYY-MM-DDtoYYYY-MM-DD' - Timeframe is also supported by specifying the date range e.g. 2022-04-01to2022-07-30."
  );

export const RequestParamsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .refine((str) => str.split(/\s+/).length <= 50, 'Query cannot exceed 50 words')
    .describe(
      "The user's search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query."
    ),
  country: CountryCodesSchema.describe(
    'The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries.'
  ).optional(),
  search_lang: SearchLangCodesSchema.describe(
    'The search language preference. The 2 or more character language code for which the search results are provided.'
  ).optional(),
  count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe(
      'The maximum number of search results considered to select the LLM context data. The default is 20 and the maximum is 50.'
    )
    .optional(),
  spellcheck: z.boolean().describe('Whether to enable spellcheck on the query.').optional(),
  maximum_number_of_urls: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe('Maximum number of different URLs to include in LLM context.')
    .optional(),
  maximum_number_of_tokens: z
    .number()
    .int()
    .min(1024)
    .max(32768)
    .describe(
      'Approximate maximum number of tokens to include in context. The default is 8192 and maximum is 32768.'
    )
    .optional(),
  maximum_number_of_snippets: z
    .number()
    .int()
    .min(1)
    .max(256)
    .describe(
      'Maximum number of different snippets (or chunks of text) to include in LLM context. The default is 50 and maximum is 256.'
    )
    .optional(),
  context_threshold_mode: z
    .enum(['disabled', 'strict', 'lenient', 'balanced'])
    .describe(
      'The mode to use to determine the threshold for including content in context. Default is balanced.'
    )
    .optional(),
  maximum_number_of_tokens_per_url: z
    .number()
    .int()
    .min(512)
    .max(8192)
    .describe(
      'Maximum number of tokens to include per URL. The default is 4096 and maximum is 8192.'
    )
    .optional(),
  maximum_number_of_snippets_per_url: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe(
      'Maximum number of snippets to include per URL. The default is 50 and maximum is 100.'
    )
    .optional(),
  goggles: z
    .union([z.string(), z.array(z.string())])
    .describe(
      "Goggles act as a custom re-ranking on top of Brave's search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. Multiple goggle URLs and/or definitions can be provided in an array. For more details, refer to the Goggles repository (i.e., https://github.com/brave/goggles-quickstart)."
    )
    .optional(),
  freshness: FreshnessSchema.optional(),
  enable_local: z
    .boolean()
    .describe(
      'Whether to enable local recall. Not setting this value means auto-detect and uses local recall if any of the localization headers are provided.'
    )
    .optional(),
  enable_source_metadata: z
    .boolean()
    .describe(
      'Enable source metadata enrichment (site_name, favicon) in the sources attribute of the response.'
    )
    .optional(),
});

export const RequestHeadersSchema = z.object({
  'x-loc-lat': z
    .number()
    .min(-90)
    .max(90)
    .describe(
      "The latitude of the client's geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees."
    )
    .optional(),
  'x-loc-long': z
    .number()
    .min(-180)
    .max(180)
    .describe(
      "The longitude of the client's geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees."
    )
    .optional(),
  'x-loc-city': z.string().describe('The generic name of the client city').optional(),
  'x-loc-state': z
    .string()
    .max(3)
    .describe(
      "A code which could be up to three characters, that represent the client's state/region. The region is the first-level subdivision (the broadest or least specific) of the ISO 3166-2 code."
    )
    .optional(),
  'x-loc-state-name': z
    .string()
    .describe(
      'The name of the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the ISO 3166-2 code.'
    )
    .optional(),
  'x-loc-country': z
    .string()
    .length(2)
    .describe(
      'The two letter country code for the client’s country. For a list of country codes, see ISO 3166-1 alpha-2'
    )
    .optional(),
  'x-loc-postal-code': z.string().describe('The client’s postal code').optional(),
  'api-version': z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe(
      'The API version to use. This is denoted by the format YYYY-MM-DD. Default is the latest that is available. Read more about API versioning at https://api-dashboard.search.brave.com/documentation/guides/versioning.'
    )
    .optional(),
  accept: z
    .enum(['application/json', '*/*'])
    .describe('The default supported media type is application/json.')
    .optional(),
  'cache-control': z
    .literal('no-cache')
    .describe(
      'Brave Search will return cached content by default. To prevent caching set the Cache-Control header to no-cache. This is currently done as best effort.'
    )
    .optional(),
  'user-agent': z
    .string()
    .describe(
      'The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on curating user agents, see RFC 9110.'
    )
    .optional(),
});

export const LlmContextInputSchema = z.object({
  ...RequestParamsSchema.shape,
  ...RequestHeadersSchema.shape,
});

export type LlmContextInput = z.input<typeof LlmContextInputSchema>;
export type LlmQueryParams = z.infer<typeof RequestParamsSchema>;
export type LlmRequestHeaders = z.infer<typeof RequestHeadersSchema>;
