import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user']),
  content: z.string(),
});

const WebSearchOptionsSchema = z.object({
  search_context_size: z.enum(['small', 'medium', 'high']).optional(),
  user_location: z
    .object({
      approximate: z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        timezone: z.string().optional(),
      }),
      type: z.literal('approximate'),
    })
    .optional(),
});

export const RequestBodySchema = z.object({
  messages: z.array(MessageSchema),
  model: z.enum(['brave-pro', 'brave']).optional(),
  max_completion_tokens: z.number().int().optional(),
  metadata: z.any().optional(), // TODO: add metadata schema
  seed: z.number().int().optional(),
  stream: z.boolean(), //.optional(),
  web_search_options: WebSearchOptionsSchema.optional(),
  country: z.string().optional(), // TODO: Connect to common schema
  language: z.string().optional(), // TODO: Connect to common schema
  safesearch: z.string().optional(), // TODO: Connect to common schema
  enable_entities: z.boolean().optional(),
  enable_citations: z.boolean().optional(),
  enable_research: z.boolean().optional(),
  research_allow_thinking: z.boolean().optional(),
  research_maximum_number_of_tokens_per_query: z.number().int().optional(),
  research_maximum_number_of_queries: z.number().int().optional(),
  research_maximum_number_of_iterations: z.number().int().optional(),
  research_maximum_number_of_seconds: z.number().int().optional(),
  research_maximum_number_of_results_per_query: z.number().int().optional(),
});

export const RequestHeadersSchema = z.object({
  // TODO: Not documented in API dashboard
});

export const AnswersInputSchema = z.object({
  ...RequestBodySchema.shape,
  ...RequestHeadersSchema.shape,
});

export type AnswersInput = z.infer<typeof AnswersInputSchema>;
export type AnswersRequestBody = z.infer<typeof RequestBodySchema>;
export type AnswersRequestHeaders = z.infer<typeof RequestHeadersSchema>;
