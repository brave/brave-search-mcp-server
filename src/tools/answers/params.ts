import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/summarizer/answers
 */

const webSearchOptionsSchema = z
  .object({
    search_context_size: z
      .enum(['low', 'medium', 'high'])
      .describe('Amount of search context to retrieve for grounding.')
      .optional(),
  })
  .optional();

export const answersQueryParams = z
  .object({
    query: z
      .string()
      .min(1)
      .describe('The question to answer. Sent as a single user message to the Answers API.'),
    model: z
      .enum(['brave-pro', 'brave'])
      .default('brave')
      .optional()
      .describe('The Answers model to use. Defaults to "brave".'),
    country: z
      .string()
      .default('US')
      .optional()
      .describe('Search country (2-letter country code or "ALL"). Defaults to "US".'),
    language: z.string().default('en').optional().describe('Response language. Defaults to "en".'),
    safesearch: z
      .enum(['off', 'moderate', 'strict'])
      .default('moderate')
      .optional()
      .describe('Search safety level. Defaults to "moderate".'),
    max_completion_tokens: z
      .number()
      .int()
      .positive()
      .describe('Upper bound on completion tokens.')
      .optional(),
    enable_entities: z
      .boolean()
      .default(false)
      .optional()
      .describe('Whether to include entity information in the response.'),
    enable_citations: z
      .boolean()
      .default(false)
      .optional()
      .describe(
        'Include inline citation tags in the answer. Requires streaming on the upstream API; the MCP tool buffers the stream before returning.'
      ),
    enable_research: z
      .boolean()
      .default(false)
      .optional()
      .describe(
        'Enable multi-iteration deep research mode. Requires streaming on the upstream API; the MCP tool buffers the stream before returning.'
      ),
    research_allow_thinking: z
      .boolean()
      .default(true)
      .optional()
      .describe('Enable extended thinking during research mode.'),
    research_maximum_number_of_tokens_per_query: z
      .number()
      .int()
      .min(1024)
      .max(16384)
      .describe('Maximum tokens per research query (1024-16384).')
      .optional(),
    research_maximum_number_of_queries: z
      .number()
      .int()
      .min(1)
      .max(50)
      .describe('Maximum total search queries during research (1-50).')
      .optional(),
    research_maximum_number_of_iterations: z
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Maximum research iterations (1-5).')
      .optional(),
    research_maximum_number_of_seconds: z
      .number()
      .int()
      .min(1)
      .max(300)
      .describe('Research time budget in seconds (1-300).')
      .optional(),
    research_maximum_number_of_results_per_query: z
      .number()
      .int()
      .min(1)
      .max(60)
      .describe('Maximum results per search query during research (1-60).')
      .optional(),
    web_search_options: webSearchOptionsSchema.describe(
      'OpenAI-compatible web search options for grounding context size.'
    ),
  })
  .superRefine((value, ctx) => {
    if (value.enable_research && value.enable_citations) {
      ctx.addIssue({
        code: 'custom',
        message: 'enable_research and enable_citations cannot be used together.',
        path: ['enable_citations'],
      });
    }
  });

export type AnswersQueryParams = z.infer<typeof answersQueryParams>;
