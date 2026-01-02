import { z } from 'zod';

export const params = z.object({
  query: z
    .string()
    .max(400)
    .refine((str) => str.split(/\s+/).length <= 50, 'Query cannot exceed 50 words')
    .describe('Search query (max 400 chars, 50 words)'),
  country: z
    .enum([
      'ALL',
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
    ])
    .default('US')
    .describe(
      'Search query country, where the results come from. The country string is limited to 2 character country codes of supported countries.'
    )
    .optional(),
  search_lang: z
    .enum([
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
      'gu',
      'he',
      'hi',
      'hu',
      'is',
      'it',
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
    ])
    .default('en')
    .describe(
      'Search language preference. The 2 or more character language code for which the search results are provided.'
    )
    .optional(),
  ui_lang: z
    .enum([
      'es-AR',
      'en-AU',
      'de-AT',
      'nl-BE',
      'fr-BE',
      'pt-BR',
      'en-CA',
      'fr-CA',
      'es-CL',
      'da-DK',
      'fi-FI',
      'fr-FR',
      'de-DE',
      'zh-HK',
      'en-IN',
      'en-ID',
      'it-IT',
      'ja-JP',
      'ko-KR',
      'en-MY',
      'es-MX',
      'nl-NL',
      'en-NZ',
      'no-NO',
      'zh-CN',
      'pl-PL',
      'en-PH',
      'ru-RU',
      'en-ZA',
      'es-ES',
      'sv-SE',
      'fr-CH',
      'de-CH',
      'zh-TW',
      'tr-TR',
      'en-GB',
      'en-US',
      'es-US',
    ])
    .default('en-US')
    .describe(
      'The language of the UI. The 2 or more character language code for which the search results are provided.'
    )
    .optional(),
  count: z
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe(
      'Number of results (1-20, default 10). Applies only to web search results (i.e., has no effect on locations, news, videos, etc.)'
    )
    .optional(),
  offset: z
    .int()
    .min(0)
    .max(9)
    .default(0)
    .describe('Pagination offset (max 9, default 0)')
    .optional(),
  safesearch: z
    .enum(['off', 'moderate', 'strict'])
    .default('moderate')
    .describe(
      "Filters search results for adult content. The following values are supported: 'off' - No filtering. 'moderate' - Filters explicit content (e.g., images and videos), but allows adult domains in search results. 'strict' - Drops all adult content from search results. The default value is 'moderate'."
    )
    .optional(),
  freshness: z
    .enum(['pd', 'pw', 'pm', 'py', 'YYYY-MM-DDtoYYYY-MM-DD'])
    .describe(
      "Filters search results by when they were discovered. The following values are supported: 'pd' - Discovered within the last 24 hours. 'pw' - Discovered within the last 7 days. 'pm' - Discovered within the last 31 days. 'py' - Discovered within the last 365 days. 'YYYY-MM-DDtoYYYY-MM-DD' - Timeframe is also supported by specifying the date range e.g. 2022-04-01to2022-07-30."
    )
    .optional(),
  text_decorations: z
    .boolean()
    .default(true)
    .describe(
      'Whether display strings (e.g. result snippets) should include decoration markers (e.g. highlighting characters).'
    )
    .optional(),
  spellcheck: z
    .boolean()
    .default(true)
    .describe('Whether to spellcheck the provided query.')
    .optional(),
  result_filter: z
    .array(
      z.enum([
        'discussions',
        'faq',
        'infobox',
        'news',
        'query',
        'summarizer',
        'videos',
        'web',
        'locations',
        'rich',
      ])
    )
    .default(['web', 'query'])
    .describe("Result filter (default ['web', 'query'])")
    .optional(),
  goggles: z
    .array(z.string())
    .describe(
      "Goggles act as a custom re-ranking on top of Brave's search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, refer to the Goggles repository (i.e., https://github.com/brave/goggles-quickstart)."
    )
    .optional(),
  units: z
    .union([z.literal('metric'), z.literal('imperial')])
    .describe('The measurement units. If not provided, units are derived from search country.')
    .optional(),
  extra_snippets: z
    .boolean()
    .describe(
      'A snippet is an excerpt from a page you get as a result of the query, and extra_snippets allow you to get up to 5 additional, alternative excerpts. Only available under Free AI, Base AI, Pro AI, Base Data, Pro Data and Custom plans.'
    )
    .optional(),
  summary: z
    .boolean()
    .describe(
      'This parameter enables summary key generation in web search results. This is required for summarizer to be enabled.'
    )
    .optional(),
});

export type QueryParams = z.infer<typeof params>;

export default params;
