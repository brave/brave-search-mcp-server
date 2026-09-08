import { z } from 'zod';

export const summarizerQueryParams = z.object({
  key: z
    .string()
    .describe('The key is equal to value of field key as part of the Summarizer response model.'),
  entity_info: z
    .boolean()
    .default(false)
    .describe('Returns extra entities info with the summary response.')
    .optional(),
  inline_references: z
    .boolean()
    .default(false)
    .describe('Adds inline references to the summary response.')
    .optional(),
});

export type SummarizerQueryParams = z.infer<typeof summarizerQueryParams>;
