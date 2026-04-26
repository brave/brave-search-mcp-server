import { z } from 'zod';

/**
 * Keep up to date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/web/place_search#responses
 */

const ThumbnailSchema = z.looseObject({
  src: z.string().describe('The served URL of the picture thumbnail.').optional(),
  original: z.string().describe('The original URL of the image.').optional(),
});

const PostalAddressSchema = z.looseObject({
  type: z.literal('PostalAddress').optional(),
  country: z.string().describe('The country associated with the location.').optional(),
  postalCode: z.string().describe('The postal code associated with the location.').optional(),
  streetAddress: z.string().describe('The street address associated with the location.').optional(),
  addressRegion: z
    .string()
    .describe('The region associated with the location. Usually a state.')
    .optional(),
  addressLocality: z
    .string()
    .describe('The address locality or subregion associated with the location.')
    .optional(),
  displayAddress: z.string().describe('The displayed address string.').optional(),
});

const DayOpeningHoursSchema = z.looseObject({
  abbr_name: z.string().describe('Short name of the day of the week (e.g. "Mon").').optional(),
  full_name: z.string().describe('Full name of the day of the week (e.g. "Monday").').optional(),
  opens: z.string().describe('Opening time in 24h format (e.g. "09:00").').optional(),
  closes: z.string().describe('Closing time in 24h format (e.g. "17:00").').optional(),
});

const OpeningHoursSchema = z.looseObject({
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
});

const ContactSchema = z.looseObject({
  email: z.string().describe('Contact email for the business.').optional(),
  telephone: z.string().describe('Contact telephone number for the business.').optional(),
});

const DistanceSchema = z.looseObject({
  value: z.number().describe('The quantity of the unit.'),
  units: z.string().describe('The name of the unit associated with the quantity.'),
});

const ProfileSchema = z.looseObject({
  type: z.string().optional(),
  name: z.string().optional(),
  long_name: z.string().optional(),
  url: z.string().optional(),
  img: z.string().optional(),
});

const RatingSchema = z.looseObject({
  ratingValue: z.number().describe('The current value of the rating.').optional(),
  bestRating: z.number().describe('Highest possible rating value.').optional(),
  reviewCount: z.number().describe('Number of reviews backing the rating.').optional(),
  profile: ProfileSchema.optional(),
  is_tripadvisor: z
    .boolean()
    .describe('Whether the rating originates from Tripadvisor.')
    .optional(),
});

const ReviewSchema = z.looseObject({
  title: z.string().describe('The title of the review.'),
  description: z.string().describe('A description seen in the review.'),
  date: z.string().describe('The date when the review was published.'),
  rating: RatingSchema.optional(),
  author: ProfileSchema.optional(),
});

const ReviewsSchema = z.looseObject({
  results: z
    .array(ReviewSchema)
    .describe('A list of trip advisor reviews for the entity.')
    .optional(),
  viewMoreUrl: z
    .string()
    .describe('A URL to a web page where more information on the result can be seen.')
    .optional(),
  reviews_in_foreign_language: z
    .boolean()
    .describe('Any reviews available in a foreign language.')
    .optional(),
});

const PicturesSchema = z.looseObject({
  viewMoreUrl: z.string().describe('URL where additional pictures can be viewed.').optional(),
  results: z.array(ThumbnailSchema).describe('Thumbnail entries for the location.').optional(),
});

const ActionSchema = z.looseObject({
  type: z.string().describe('The type representing the action.'),
  url: z.string().describe('A URL representing the action to be taken.'),
});

const MetaUrlSchema = z.looseObject({
  scheme: z.string().describe('The protocol scheme extracted from the URL.'),
  netloc: z.string().describe('The network location part extracted from the URL.'),
  hostname: z.string().describe('The lowercased domain name extracted from the URL.').optional(),
  favicon: z.string().describe('The favicon used for the URL.').optional(),
  path: z
    .string()
    .describe('The hierarchical path of the URL useful as a display string.')
    .optional(),
});

const ResultsSchema = z.looseObject({
  title: z.string().describe('The display title of the location.'),
  url: z.string().describe('Primary URL associated with the location.'),
  is_source_local: z.boolean().optional(),
  is_source_both: z.boolean().optional(),
  description: z
    .string()
    .describe('Short description of the location (e.g. "Plaza", "Theater").')
    .optional(),
  page_age: z.string().describe('The age of the page as a date string.').optional(),
  page_fetched: z
    .string()
    .describe('The date the page was last fetched as a date string.')
    .optional(),
  fetched_content_timestamp: z
    .number()
    .describe('The timestamp of the content when it was fetched.')
    .optional(),
  profile: ProfileSchema.optional(),
  language: z.string().describe('The language of the page.').optional(),
  family_friendly: z.boolean().optional(),
  meta_url: MetaUrlSchema.optional(),
});

const ResultSchema = z.looseObject({
  title: z.string().describe('The display title of the location.'),
  url: z.string().describe('Primary URL associated with the location.'),
  is_source_local: z.boolean().optional(),
  is_source_both: z.boolean().optional(),
  description: z
    .string()
    .describe('Short description of the location (e.g. "Plaza", "Theater").')
    .optional(),
  page_age: z.string().describe('The age of the page as a date string.').optional(),
  page_fetched: z
    .string()
    .describe('The date the page was last fetched as a date string.')
    .optional(),
  fetched_content_timestamp: z
    .number()
    .describe('The timestamp of the content when it was fetched.')
    .optional(),
  profile: ProfileSchema.optional(),
  language: z.string().describe('The language of the page.').optional(),
  family_friendly: z.boolean().optional(),
  type: z.literal('location_result').describe('Result type identifier.').optional(),
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
  distance: DistanceSchema.optional(),
  profiles: z
    .array(ProfileSchema)
    .describe('External profiles (e.g. data providers) associated with the result.')
    .optional(),
  reviews: ReviewsSchema.optional(),
  pictures: PicturesSchema.optional(),
  action: ActionSchema.optional(),
  serves_cuisine: z.array(z.string()).describe('List of cuisine categories served.').optional(),
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
  results: z.array(ResultsSchema).describe('Web results related to this location.').optional(),
});

const QuerySchema = z.looseObject({
  original: z
    .string()
    .describe('The original query string as supplied by the caller (may be empty).'),
  altered: z
    .string()
    .describe('The altered query string as supplied by the caller (may be empty).')
    .optional(),
  spellcheck_off: z.boolean().optional(),
  show_strict_warning: z.boolean().optional(),
});

const LocationSchema = z.looseObject({
  coordinates: z.array(z.number()).describe('Latitude/longitude of the resolved search area.'),
  name: z.string().describe('Human-readable name of the resolved search area.').optional(),
  country: z.string().describe('ISO country code for the resolved search area.').optional(),
});

export const PlaceSearchApiResponseSchema = z.looseObject({
  type: z
    .literal('locations')
    .describe('Top-level response discriminator. Always "locations" for Place Search.'),
  query: QuerySchema.optional(),
  results: z
    .array(ResultSchema)
    .describe('Array of points-of-interest matching the search.')
    .optional(),
  location: LocationSchema.describe(
    'The resolved search-area metadata, when available.'
  ).optional(),
});

export type PlaceSearchApiResponse = z.infer<typeof PlaceSearchApiResponseSchema>;
