import { z } from 'zod';
import { ConfidenceSchema, ExtraSchema } from './response.js';

export const SimplifiedImageResultSchema = z.object({
  title: z.string(),
  url: z.url(),
  page_fetched: z.iso.datetime(),
  confidence: ConfidenceSchema,
  properties: z.object({
    url: z.url(),
    width: z.int().positive(),
    height: z.int().positive(),
  }),
});

const OutputSchema = z.object({
  type: z.literal('object'),
  items: z.array(SimplifiedImageResultSchema),
  count: z.int().nonnegative(),
  might_be_offensive: ExtraSchema.shape.might_be_offensive,
});

export default OutputSchema;
