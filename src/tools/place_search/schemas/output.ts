import { z } from 'zod';

/**
 * Keep up to date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/web/place_search#responses
 */

const ThumbnailSchema = z
  .object({
    src: z.string().describe('The served URL of the picture thumbnail.').optional(),
    original: z.string().describe('The original URL of the image.').optional(),
  })
  .loose();

const PostalAddressSchema = z
  .object({
    type: z.literal('PostalAddress').optional(),
    country: z.string().describe('The country associated with the location.').optional(),
    postalCode: z.string().describe('The postal code associated with the location.').optional(),
    streetAddress: z
      .string()
      .describe('The street address associated with the location.')
      .optional(),
    addressRegion: z
      .string()
      .describe('The region associated with the location. Usually a state.')
      .optional(),
    addressLocality: z
      .string()
      .describe('The address locality or subregion associated with the location.')
      .optional(),
    displayAddress: z.string().describe('The displayed address string.').optional(),
  })
  .loose();

const DayOpeningHoursSchema = z
  .object({
    abbr_name: z.string().describe('Short name of the day of the week (e.g. "Mon").').optional(),
    full_name: z.string().describe('Full name of the day of the week (e.g. "Monday").').optional(),
    opens: z.string().describe('Opening time in 24h format (e.g. "09:00").').optional(),
    closes: z.string().describe('Closing time in 24h format (e.g. "17:00").').optional(),
  })
  .loose();

const OpeningHoursSchema = z
  .object({
    current_day: z
      .array(DayOpeningHoursSchema)
      .describe(
        'Opening hours for the current day. May contain multiple entries when the location closes and reopens during the day.'
      )
      .optional(),
    days: z
      .array(z.union([DayOpeningHoursSchema, z.array(DayOpeningHoursSchema)]))
      .describe(
        'Opening hours for the rest of the week. Each entry may itself be either a single day-hours object or an array of day-hours objects (when a day has multiple open/close intervals).'
      )
      .optional(),
  })
  .loose();

const ContactSchema = z
  .object({
    email: z.string().describe('Contact email for the business.').optional(),
    telephone: z.string().describe('Contact telephone number for the business.').optional(),
  })
  .loose();

const ProfileSchema = z
  .object({
    type: z.string().optional(),
    name: z.string().optional(),
    long_name: z.string().optional(),
    url: z.string().optional(),
    img: z.string().optional(),
  })
  .loose();

const RatingSchema = z
  .object({
    ratingValue: z.number().describe('The current value of the rating.').optional(),
    bestRating: z.number().describe('Highest possible rating value.').optional(),
    reviewCount: z.number().describe('Number of reviews backing the rating.').optional(),
    profile: ProfileSchema.optional(),
    is_tripadvisor: z
      .boolean()
      .describe('Whether the rating originates from Tripadvisor.')
      .optional(),
  })
  .loose();

const PicturesSchema = z
  .object({
    viewMoreUrl: z.string().describe('URL where additional pictures can be viewed.').optional(),
    results: z.array(ThumbnailSchema).describe('Thumbnail entries for the location.').optional(),
  })
  .loose();

const ResultSchema = z
  .object({
    type: z.literal('location_result').describe('Result type identifier.').optional(),
    title: z.string().describe('The display title of the location.').optional(),
    url: z.string().describe('Primary URL associated with the location.').optional(),
    description: z
      .string()
      .describe('Short description of the location (e.g. "Plaza", "Theater").')
      .optional(),
    is_source_local: z.boolean().optional(),
    is_source_both: z.boolean().optional(),
    family_friendly: z.boolean().optional(),
    provider_url: z
      .string()
      .describe('URL of the upstream provider for this result. May be an empty string.')
      .optional(),
    coordinates: z
      .array(z.number())
      .describe('Latitude/longitude pair for the location, when available.')
      .optional(),
    zoom_level: z.number().describe('Suggested zoom level when displaying on a map.').optional(),
    thumbnail: ThumbnailSchema.optional(),
    postal_address: PostalAddressSchema.optional(),
    opening_hours: OpeningHoursSchema.optional(),
    contact: ContactSchema.optional(),
    price_range: z
      .string()
      .describe('Price classification string for the business (e.g. "$", "$$").')
      .optional(),
    rating: RatingSchema.optional(),
    profiles: z
      .array(ProfileSchema)
      .describe('External profiles (e.g. data providers) associated with the result.')
      .optional(),
    pictures: PicturesSchema.optional(),
    categories: z.array(z.string()).describe('List of category labels.').optional(),
    icon_category: z.string().describe('Suggested icon category (e.g. "cafe").').optional(),
    timezone: z.string().describe('IANA timezone identifier for the location.').optional(),
    timezone_offset: z
      .number()
      .describe("UTC offset of the location's timezone, in minutes.")
      .optional(),
    id: z
      .string()
      .describe(
        'Temporary identifier for the location, valid for ~8 hours. Can be used with brave_local_search-style endpoints to fetch additional information.'
      )
      .optional(),
  })
  .loose();

const QuerySchema = z
  .object({
    original: z
      .string()
      .describe('The original query string as supplied by the caller (may be empty).')
      .optional(),
    spellcheck_off: z.boolean().optional(),
    show_strict_warning: z.boolean().optional(),
  })
  .loose();

const LocationSchema = z
  .object({
    coordinates: z
      .array(z.number())
      .describe('Latitude/longitude of the resolved search area.')
      .optional(),
    name: z.string().describe('Human-readable name of the resolved search area.').optional(),
    country: z.string().describe('ISO country code for the resolved search area.').optional(),
  })
  .loose();

export const PlaceSearchApiResponseSchema = z
  .object({
    type: z
      .literal('locations')
      .describe('Top-level response discriminator. Always "locations" for Place Search.'),
    query: QuerySchema.nullable().optional(),
    results: z
      .array(ResultSchema)
      .describe('Array of points-of-interest matching the search.')
      .nullable()
      .optional(),
    location: LocationSchema.nullable()
      .describe('The resolved search-area metadata, when available.')
      .optional(),
  })
  .loose();

export type PlaceSearchApiResponse = z.infer<typeof PlaceSearchApiResponseSchema>;
