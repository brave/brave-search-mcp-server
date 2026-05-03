import { z } from 'zod';

/**
 * Keep up-to-date with documentation:
 * https://api-dashboard.search.brave.com/api-reference/web/place_search
 */

const CountryCodesSchema = z.enum([
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CL',
  'DK',
  'FI',
  'FR',
  'DE',
  'GR',
  'HK',
  'IN',
  'ID',
  'IT',
  'JP',
  'KR',
  'MY',
  'MX',
  'NL',
  'NZ',
  'NO',
  'CN',
  'PL',
  'PT',
  'PH',
  'RU',
  'SA',
  'ZA',
  'ES',
  'SE',
  'CH',
  'TW',
  'TR',
  'GB',
  'US',
]);

const SearchLangCodesSchema = z.enum([
  'ar',
  'eu',
  'bn',
  'bg',
  'ca',
  'zh-hans',
  'zh-hant',
  'hr',
  'cs',
  'da',
  'nl',
  'en',
  'en-gb',
  'et',
  'fi',
  'fr',
  'gl',
  'de',
  'el',
  'gu',
  'he',
  'hi',
  'hu',
  'is',
  'it',
  'jp',
  'kn',
  'ko',
  'lv',
  'lt',
  'ms',
  'ml',
  'mr',
  'nb',
  'pl',
  'pt-br',
  'pt-pt',
  'pa',
  'ro',
  'ru',
  'sr',
  'sk',
  'sl',
  'es',
  'sv',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'vi',
]);

const UiLangCodesSchema = z.enum([
  'es-AR',
  'en-AU',
  'de-AT',
  'nl-BE',
  'fr-BE',
  'pt-BR',
  'en-CA',
  'fr-CA',
  'es-CL',
  'da-DK',
  'fi-FI',
  'fr-FR',
  'de-DE',
  'zh-HK',
  'en-IN',
  'en-ID',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'en-MY',
  'es-MX',
  'nl-NL',
  'en-NZ',
  'no-NO',
  'zh-CN',
  'pl-PL',
  'en-PH',
  'ru-RU',
  'en-ZA',
  'es-ES',
  'sv-SE',
  'fr-CH',
  'de-CH',
  'zh-TW',
  'tr-TR',
  'en-GB',
  'en-US',
  'es-US',
]);

export const RequestParamsSchema = z.object({
  query: z
    .string()
    .trim()
    .max(400)
    .refine(
      (str) => str.length === 0 || str.split(/\s+/).length <= 50,
      'Query cannot exceed 50 words'
    )
    .transform((str) => (str.length === 0 ? undefined : str))
    .describe(
      'Query string. Shape influences the response: POI-like queries -> `results`; bare/ambiguous city names -> `cities`; address- or street-shaped queries with a geographic anchor -> `addresses` and/or `streets`. If omitted, returns general POIs in the supplied area.'
    )
    .optional(),
  radius: z
    .number()
    .min(0)
    .describe(
      'Bias toward results closer to the supplied coordinates, in meters. NOT a hard cutoff -- the API may still return more distant results. If omitted, the search is performed globally.'
    )
    .optional(),
  count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe('Number of results to return. Maximum is 50. Default is 20.')
    .optional(),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe(
      'Latitude of the geographical coordinates around which to search, in degrees (-90 to 90). Typically paired with `longitude`.'
    )
    .optional(),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe(
      'Longitude of the geographical coordinates around which to search, in degrees (-180 to 180). Typically paired with `latitude`.'
    )
    .optional(),
  location: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Location string to search around, used as an alternative to `latitude` and `longitude`. For US locations prefer the form '<city> <state> <country name>' (e.g. 'san francisco ca united states'); for non-US locations use '<city> <country name>' (e.g. 'tokyo japan'). No commas or special characters needed; capitalization does not matter."
    )
    .optional(),
  country: CountryCodesSchema.describe(
    "Two-letter country code (ISO 3166-1 alpha-2) used to scope the search. Defaults to 'US'."
  ).optional(),
  search_lang: SearchLangCodesSchema.describe(
    "Language for the search results. Defaults to 'en'."
  ).optional(),
  ui_lang: UiLangCodesSchema.describe(
    "User interface language for the response, usually of the form '<language>-<region>'. Defaults to 'en-US'."
  ).optional(),
  units: z
    .enum(['metric', 'imperial'])
    .describe("Units of measurement for distance values. Defaults to 'metric'.")
    .optional(),
  safesearch: z
    .enum(['off', 'moderate', 'strict'])
    .describe(
      "Safe search level for the query results. 'off' - No filtering. 'moderate' - Filter out explicit content. 'strict' - Filter out explicit and suggestive content. Defaults to 'strict'."
    )
    .optional(),
  spellcheck: z
    .boolean()
    .describe('Whether to apply spellcheck before executing the search. Defaults to true.')
    .optional(),
  geoloc: z.string().describe('Optional geolocation token used to refine results.').optional(),
});

export const RequestHeadersSchema = z.object({
  'api-version': z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe(
      'The API version to use. This is denoted by the format YYYY-MM-DD. Default is the latest that is available. Read more about API versioning at https://api-dashboard.search.brave.com/documentation/guides/versioning.'
    )
    .optional(),
  accept: z
    .enum(['application/json', '*/*'])
    .describe('The default supported media type is application/json.')
    .optional(),
  'cache-control': z
    .literal('no-cache')
    .describe(
      'Brave Search will return cached content by default. To prevent caching set the Cache-Control header to no-cache. This is currently done as best effort.'
    )
    .optional(),
  'user-agent': z
    .string()
    .describe(
      'The user agent originating the request. Brave Search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on curating user agents, see RFC 9110.'
    )
    .optional(),
});

export const PlaceSearchInputSchema = z.object({
  ...RequestParamsSchema.shape,
  ...RequestHeadersSchema.shape,
});

export type PlaceSearchInput = z.input<typeof PlaceSearchInputSchema>;
export type PlaceSearchQueryParams = z.infer<typeof RequestParamsSchema>;
export type PlaceSearchRequestHeaders = z.infer<typeof RequestHeadersSchema>;
