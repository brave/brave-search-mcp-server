import { z } from 'zod';
import { ConfidenceSchema, ExtraSchema } from './response.js';

export const SimplifiedImageResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  page_fetched: z.string().datetime(),
  confidence: ConfidenceSchema,
  properties: z.object({
    url: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

const OutputSchema = z.object({
  type: z.literal('object'),
  items: z.array(SimplifiedImageResultSchema),
  count: z.number().int().nonnegative(),
  might_be_offensive: ExtraSchema.shape.might_be_offensive,
});

export default OutputSchema;
