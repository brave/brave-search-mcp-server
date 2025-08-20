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
  count: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe(
      'Number of results (1-200, default 50). Combine this parameter with `offset` to paginate search results.'
    )
    .optional(),
  safesearch: z
    .union([z.literal('off'), z.literal('strict')])
    .default('strict')
    .describe(
      "Filters search results for adult content. The following values are supported: 'off' - No filtering. 'strict' - Drops all adult content from search results."
    )
    .optional(),
  spellcheck: z
    .boolean()
    .default(true)
    .describe('Whether to spellcheck provided query.')
    .optional(),
});

export type QueryParams = z.infer<typeof params>;

export default params;
