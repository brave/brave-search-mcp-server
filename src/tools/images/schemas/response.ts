import { z } from 'zod';

/**
 * https://api-dashboard.search.brave.com/app/documentation/image-search/responses
 */

const QuerySchema = z.object({
  original: z.string().describe('The original query string.'),
  altered: z.string().optional().describe('The altered query string.'),
  spellcheck_off: z.boolean().optional().describe('Whether spellcheck was disabled.'),
  show_strict_warning: z
    .boolean()
    .optional()
    .describe('When true, some results were blocked by safesearch.'),
});

const ThumbnailSchema = z.object({
  src: z.string().url().optional().describe('The URL of the thumbnail.'),
  width: z.number().int().positive().optional().describe('The width of the thumbnail.'),
  height: z.number().int().positive().optional().describe('The height of the thumbnail.'),
});

const PropertiesSchema = z.object({
  url: z.string().url().optional().describe('The URL of the image.'),
  placeholder: z.string().url().optional().describe('The lower resolution placeholder image.'),
  width: z.number().int().positive().optional().describe('The width of the image.'),
  height: z.number().int().positive().optional().describe('The height of the image.'),
});

const MetaUrlSchema = z.object({
  scheme: z.enum(['https', 'http']).optional().describe('The scheme of the URL.'),
  netloc: z.string().optional().describe('The network location of the URL.'),
  hostname: z.string().optional().describe('The lowercased hostname of the URL.'),
  favicon: z.string().url().optional().describe('The URL of the favicon of the URL.'),
  path: z.string().optional().describe('The path of the URL (useful as a display string).'),
});

export const ConfidenceSchema = z
  .enum(['low', 'medium', 'high'])
  .describe('The confidence level of the result.');

const ImageResultSchema = z.object({
  type: z.literal('image_result').describe('The type of result.'),
  title: z.string().optional().describe('The title of the image.'),
  url: z.string().url().optional().describe('The URL of the image.'),
  source: z.string().url().optional().describe('The source URL of the image.'),
  page_fetched: z
    .string()
    .datetime()
    .optional()
    .describe('The date and time the page was fetched.'),
  thumbnail: ThumbnailSchema.optional().describe('The thumbnail of the image.'),
  properties: PropertiesSchema.optional().describe('The metadata for the image.'),
  meta_url: MetaUrlSchema.optional().describe(
    'Information about the URL associated with the image.'
  ),
  confidence: ConfidenceSchema.optional(),
});

export const ExtraSchema = z.object({
  might_be_offensive: z.boolean().describe('Whether the image might be offensive.'),
});

export const ImageSearchApiResponseSchema = z.object({
  type: z.literal('images').describe('The type of API response.'),
  query: QuerySchema.describe('The query used to generate the results.'),
  results: z.array(ImageResultSchema).describe('The results of the image search.'),
  extra: ExtraSchema.describe('Extra information about the search.'),
});
