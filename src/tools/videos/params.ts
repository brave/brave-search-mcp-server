import { z } from 'zod';

export const params = z.object({
  query: z
    .string()
    .min(1)
    .max(400)
    .refine((str) => str.split(/\s+/).length <= 50, 'Query cannot exceed 50 words')
    .describe(
      "The user's search query. Query cannot be empty. Limited to 400 characters and 50 words."
    ),
  country: z
    .string()
    .default('US')
    .describe(
      'Search query country, where the results come from. The country string is limited to 2 character country codes of supported countries.'
    )
    .optional(),
  search_lang: z
    .string()
    .default('en')
    .describe(
      'Search language preference. The 2 or more character language code for which the search results are provided.'
    )
    .optional(),
  ui_lang: z
    .string()
    .default('en-US')
    .describe(
      'User interface language preferred in response. Usually of the format <language_code>-<country_code>. For more, see RFC 9110.'
    )
    .optional(),
  count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe(
      'Number of results (1-50, default 20). Start with 5-10 for initial discovery, use 20 for balanced results. Combine with offset for pagination.'
    )
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .max(9)
    .default(0)
    .describe(
      'Pagination offset (0-9, default 0). Example: offset=10 with count=10 gets videos 11-20. Maximum offset is 9.'
    )
    .optional(),
  spellcheck: z
    .boolean()
    .describe('Whether to spellcheck provided query.')
    .default(true)
    .optional(),
  safesearch: z
    .union([z.literal('off'), z.literal('moderate'), z.literal('strict')])
    .default('moderate')
    .describe(
      "Filters search results for adult content. The following values are supported: 'off' - No filtering. 'moderate' - Filter out explicit content. 'strict' - Filter out explicit and suggestive content. The default value is 'moderate'."
    )
    .optional(),
  freshness: z
    .union([z.literal('pd'), z.literal('pw'), z.literal('pm'), z.literal('py'), z.string()])
    .describe(
      "Filters search results by when they were discovered. The following values are supported: 'pd' - Discovered within the last 24 hours. 'pw' - Discovered within the last 7 days. 'pm' - Discovered within the last 31 days. 'py' - Discovered within the last 365 days. 'YYYY-MM-DDtoYYYY-MM-DD' - timeframe is also supported by specifying the date range (e.g. '2022-04-01to2022-07-30')."
    )
    .optional(),
});

export type QueryParams = z.infer<typeof params>;

export default params;
