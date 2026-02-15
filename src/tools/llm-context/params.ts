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
  count: z
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Number of search results to consider (1-50, default 20)')
    .optional(),
  maximum_number_of_urls: z
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum number of URLs to extract content from (1-50, default 20)')
    .optional(),
  maximum_number_of_tokens: z
    .int()
    .min(1024)
    .max(32768)
    .default(8192)
    .describe('Total token budget for the response across all URLs (1024-32768, default 8192)')
    .optional(),
  maximum_number_of_snippets: z
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of text snippets across all results (1-100, default 50)')
    .optional(),
  maximum_number_of_tokens_per_url: z
    .int()
    .min(512)
    .max(8192)
    .default(4096)
    .describe('Maximum number of tokens to extract per URL (512-8192, default 4096)')
    .optional(),
  maximum_number_of_snippets_per_url: z
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of text snippets per URL (1-100, default 50)')
    .optional(),
  context_threshold_mode: z
    .enum(['strict', 'balanced', 'lenient', 'disabled'])
    .default('balanced')
    .describe(
      "Controls relevance filtering of extracted content. 'strict' returns fewer, highly relevant results. 'balanced' (default) balances relevance and coverage. 'lenient' returns more results with lower relevance threshold. 'disabled' returns all extracted content without filtering."
    )
    .optional(),
  enable_local: z
    .boolean()
    .describe(
      'Whether to enable location-aware results. When not specified, location sensitivity is auto-detected from the query.'
    )
    .optional(),
  goggles: z
    .array(z.string())
    .describe(
      "Goggles act as a custom re-ranking on top of Brave's search index. The parameter supports both a URL where the Goggle is hosted or the definition of the Goggle. For more details, refer to the Goggles repository (i.e., https://github.com/brave/goggles-quickstart)."
    )
    .optional(),
});

export type QueryParams = z.infer<typeof params>;

export default params;
