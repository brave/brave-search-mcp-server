import { z } from 'zod';

/**
 * https://api-dashboard.search.brave.com/app/documentation/image-search/responses
 */

export const ConfidenceSchema = z
  .enum(['low', 'medium', 'high'])
  .describe('The confidence level of the result.');

export const ExtraSchema = z.object({
  might_be_offensive: z.boolean().describe('Whether the image might be offensive.').optional(),
});
