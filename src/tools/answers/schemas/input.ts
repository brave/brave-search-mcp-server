import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/ai/answers
 */

/** The largest research time budget the API accepts. */
export const MAX_RESEARCH_SECONDS = 300;

const UserLocationApproximateSchema = z.object({
  city: z
    .string()
    .optional()
    .describe('Free text input for the city of the user, e.g. "San Francisco".'),
  country: z
    .string()
    .optional()
    .describe('The two-letter ISO country code of the user, e.g. "US".'),
  region: z
    .string()
    .optional()
    .describe('Free text input for the region of the user, e.g. "California".'),
  timezone: z
    .string()
    .optional()
    .describe('The IANA timezone of the user, e.g. "America/Los_Angeles".'),
});

const UserLocationSchema = z.object({
  type: z
    .literal('approximate')
    .optional()
    .describe('The type of location approximation. Only "approximate" is supported.'),
  approximate: UserLocationApproximateSchema,
});

const WebSearchOptionsSchema = z
  .object({
    search_context_size: z
      .enum(['low', 'medium', 'high'])
      .describe('Amount of search context to retrieve for grounding.')
      .optional(),
    user_location: UserLocationSchema.optional().describe(
      'Approximate location parameters to refine search results based on geography.'
    ),
  })
  .describe(
    'OpenAI-compatible web search options: search context size and approximate user location.'
  );

export const AnswersInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('The question to answer. Sent to the Answers API as the single user message.'),
  model: z
    .enum(['brave-pro', 'brave'])
    .optional()
    .describe('The Answers model to use. Omit to use the API default.'),
  max_completion_tokens: z
    .number()
    .int()
    .positive()
    .describe(
      'Upper bound on completion tokens. An answer cut off at this limit ends with a note saying so.'
    )
    .optional(),
  web_search_options: WebSearchOptionsSchema.optional(),
  country: z.string().optional().describe('Search country (2-letter country code or "ALL").'),
  language: z.string().optional().describe('Response language code, e.g. "en".'),
  safesearch: z.enum(['off', 'moderate', 'strict']).optional().describe('Search safety level.'),
  enable_entities: z
    .boolean()
    .optional()
    .describe(
      'Request inline entity markup, rendered as markdown lists. Not supported in research mode. Best-effort: the API may emit no entity markup.'
    ),
  enable_citations: z
    .boolean()
    .optional()
    .describe(
      'Include inline citations, rendered as markdown footnotes. Not supported in research mode.'
    ),
  enable_research: z
    .boolean()
    .optional()
    .describe(
      'Answer with iterative multi-search research instead of a single search. Slower; may take several minutes.'
    ),
  research_maximum_number_of_tokens_per_query: z
    .number()
    .int()
    .min(1024)
    .max(16384)
    .describe('Research mode only. Maximum tokens per research query (1024-16384).')
    .optional(),
  research_maximum_number_of_queries: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe('Research mode only. Maximum total search queries during research (1-50).')
    .optional(),
  research_maximum_number_of_iterations: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('Research mode only. Maximum research iterations (1-5).')
    .optional(),
  research_maximum_number_of_seconds: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESEARCH_SECONDS)
    .describe(`Research mode only. Research time budget in seconds (1-${MAX_RESEARCH_SECONDS}).`)
    .optional(),
  research_maximum_number_of_results_per_query: z
    .number()
    .int()
    .min(1)
    .max(60)
    .describe(
      'Research mode only. Maximum results per search query during research (1-60). The API default is 30.'
    )
    .optional(),
});

export type AnswersInput = z.infer<typeof AnswersInputSchema>;
