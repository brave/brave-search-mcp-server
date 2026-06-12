import { z } from 'zod';

export const UsageSchema = z.object({
  completion_tokens: z.number().int(),
  prompt_tokens: z.number().int(),
  total_tokens: z.number().int(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().int(),
    })
    .optional(),
});

const BaseResponseSchema = z.object({
  model: z.string(),
  system_fingerprint: z.string(),
  id: z.string(),
  created: z.number().int(),
});

const NonStreamingChoiceSchema = z.object({
  index: z.number().int(),
  message: z.object({
    role: z.literal('assistant'),
    content: z.string(),
  }),
  finish_reason: z.enum(['stop', 'length']),
});

export const AnswersNonStreamingResponseSchema = BaseResponseSchema.extend({
  object: z.literal('chat.completion'),
  choices: z.array(NonStreamingChoiceSchema),
  usage: UsageSchema,
});

const StreamingChoiceSchema = z.object({
  delta: z.object({
    role: z.literal('assistant'),
    content: z.string(),
  }),
  finish_reason: z.enum(['stop', 'length']).nullable(),
});

export const AnswersStreamingChunkSchema = BaseResponseSchema.extend({
  object: z.literal('chat.completion.chunk'),
  choices: z.array(StreamingChoiceSchema),
  usage: UsageSchema.nullable(),
});

export const AnswersApiResponseSchema = z.discriminatedUnion('object', [
  AnswersNonStreamingResponseSchema,
  AnswersStreamingChunkSchema,
]);

// Each citation arrives as a dedicated SSE chunk whose delta.content is the
// full <citation>{JSON}</citation> tag. The assembler strips the tag from
// content and collects the structured data in the citations array instead.
// Only present when the caller requested enable_citations: true.
export const CitationSchema = z.object({
  number: z.number().int(),
  url: z.string().url(),
  favicon: z.string(),
  snippet: z.string().optional(),
  start_index: z.number().int(),
  end_index: z.number().int(),
});

export const AnswersOutputSchema = z.object({
  id: z.string(),
  model: z.string(),
  created: z.number().int(),
  content: z.string(),
  finish_reason: z.enum(['stop', 'length']).nullable(),
  citations: z.array(CitationSchema).optional(),
  usage: UsageSchema.nullable(),
});

export type Usage = z.infer<typeof UsageSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type AnswersNonStreamingResponse = z.infer<typeof AnswersNonStreamingResponseSchema>;
export type AnswersStreamingChunk = z.infer<typeof AnswersStreamingChunkSchema>;
export type AnswersApiResponse = z.infer<typeof AnswersApiResponseSchema>;
export type AnswersOutput = z.infer<typeof AnswersOutputSchema>;

/** @deprecated Use AnswersOutput */
export type AnswersResponse = AnswersOutput;
