import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/summarizer/answers#responses
 */

const ChatCompletionMessageResponseSchema = z.object({
  role: z.literal('assistant'),
  content: z.string(),
});

const ChatCompletionChoiceSchema = z.object({
  index: z.number(),
  message: ChatCompletionMessageResponseSchema,
  finish_reason: z.string().nullable(),
});

const ChatCompletionUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
});

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.enum(['brave-pro', 'brave']),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: ChatCompletionUsageSchema.optional(),
});

export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;
