import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/summarizer/answers
 */

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
    .describe('The type of location approximation. Always "approximate".'),
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
  .describe('OpenAI-compatible web search options for grounding context size.');

const ChatCompletionMessageSchema = z.object({
  role: z.literal('user').describe('Message role. The Answers API expects "user".'),
  content: z.string().describe('The user message content.'),
});

export const AnswersInputSchema = z
  .object({
    messages: z
      .array(ChatCompletionMessageSchema)
      .length(1)
      .describe('Chat messages. The Answers API expects a single user message.'),
    model: z.enum(['brave-pro', 'brave']).default('brave').describe('The Answers model to use.'),
    max_completion_tokens: z
      .number()
      .int()
      .positive()
      .describe('Upper bound on completion tokens.')
      .optional(),
    metadata: z.record(z.string(), z.unknown()).describe('Optional metadata object.').optional(),
    seed: z.number().int().describe('Optional seed for reproducibility.').optional(),
    stream: z
      .boolean()
      .default(true)
      .describe(
        'Whether to stream the response via Server-Sent Events. Defaults to true. Required by the API for enable_entities, enable_citations, and enable_research. When true, this MCP tool buffers the stream before returning.'
      ),
    web_search_options: WebSearchOptionsSchema.optional(),
    country: z.string().optional().describe('Search country (2-letter country code or "ALL").'),
    language: z.string().optional().describe('Response language.'),
    safesearch: z.enum(['off', 'moderate', 'strict']).optional().describe('Search safety level.'),
    enable_entities: z
      .boolean()
      .optional()
      .describe('Whether to include entity information in the response. Requires stream=true.'),
    enable_citations: z
      .boolean()
      .optional()
      .describe(
        'Include inline citation tags in the answer. Requires stream=true. Incompatible with enable_research. Citation tags are converted to markdown footnotes.'
      ),
    enable_research: z
      .boolean()
      .optional()
      .describe(
        'Enable multi-iteration deep research mode. Requires stream=true. Incompatible with enable_citations.'
      ),
    research_allow_thinking: z
      .boolean()
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
      .describe(
        'Research time budget in seconds (1-300). Default 180. Controls upstream research duration; the MCP server uses a fixed 300 second streaming timeout for research mode.'
      )
      .optional(),
    research_maximum_number_of_results_per_query: z
      .number()
      .int()
      .min(1)
      .max(60)
      .describe('Maximum results per search query during research (1-60).')
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Quick sanity check: reject incompatible parameter combinations early,
    // before the tool calls the API.
    const {
      enable_entities: entities,
      enable_citations: citations,
      enable_research: research,
      stream,
    } = data;

    if ((entities === true || citations === true || research === true) && stream !== true) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Invalid request: stream must be true when enable_entities, enable_citations, or enable_research is enabled.',
      });
    }

    if (entities === true && research === true) {
      ctx.addIssue({
        code: 'custom',
        message: "Invalid request: Research mode doesn't support enable_entities.",
      });
    }

    if (citations === true && research === true) {
      ctx.addIssue({
        code: 'custom',
        message: "Invalid request: Research mode doesn't support enable_citations.",
      });
    }
  });

export type AnswersInput = z.infer<typeof AnswersInputSchema>;
