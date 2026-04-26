export interface LocalPoiSearchApiResponse {
  /** The type of local POI search API result. The value is always local_pois. */
  type: 'local_pois';
  /** Location results matching the ids in the request. */
  results?: LocationResult[];
}

export interface LocalDescriptionsSearchApiResponse {
  /** The type of local description search API result. The value is always local_descriptions. */
  type: 'local_descriptions';
  /** Location descriptions matching the ids in the request. */
  results?: LocationDescription[];
}

export interface LocationDescription {
  /** The type of a location description. The value is always local_description. */
  type: 'local_description';
  /** A Temporary id of the location with this description. */
  id: string;
  /** AI generated description of the location with the given id. */
  description?: string;
}

interface Result {
  /** The title of the web page. */
  title: string;
  /** The URL where the page is served. */
  url: string;
  is_source_local: boolean;
  is_source_both: boolean;
  /** A description for the web page. */
  description?: string;
  /** A date representing the age of the web page. */
  page_age?: string;
  /** A date representing when the web page was last fetched. */
  page_fetched?: string;
  /** A profile associated with the web page. */
  profile?: Profile;
  /** A language classification for the web page. */
  language?: string;
  /** Whether the web page is family friendly. */
  family_friendly: boolean;
}

interface Profile {
  /** The name of the profile. */
  name: string;
  /** The long name of the profile. */
  long_name: string;
  /** The original URL where the profile is available. */
  url?: string;
  /** The served image URL representing the profile. */
  img?: string;
}

export interface LocationResult extends Result {
  /** Location result type identifier. The value is always location_result. */
  type: 'location_result';
  /** A Temporary id associated with this result, which can be used to retrieve extra information about the location. It remains valid for 8 hours… */
  id?: string;
  /** The complete URL of the provider. */
  provider_url: string;
  /** A list of coordinates associated with the location. This is a lat long represented as a floating point. */
  coordinates?: number[];
  /** The zoom level on the map. */
  zoom_level: number;
  /** The thumbnail associated with the location. */
  thumbnail?: Thumbnail;
  /** The postal address associated with the location. */
  postal_address?: PostalAddress;
  /** The opening hours, if it is a business, associated with the location . */
  opening_hours?: OpeningHours;
  /** The contact of the business associated with the location. */
  contact?: Contact;
  /** A display string used to show the price classification for the business. */
  price_range?: string;
  /** The ratings of the business. */
  rating?: Rating;
  /** The distance of the location from the client. */
  distance?: Unit;
  /** Profiles associated with the business. */
  profiles?: DataProvider[];
  /** Aggregated reviews from various sources relevant to the business. */
  reviews?: Reviews;
  /** A bunch of pictures associated with the business. */
  pictures?: PictureResults;
  /** An action to be taken. */
  action?: Action;
  /** A list of cuisine categories served. */
  serves_cuisine?: string[];
  /** A list of categories. */
  categories?: string[];
  /** An icon category. */
  icon_category?: string;
  /** Web results related to this location. */
  results?: LocationWebResult;
  /** IANA timezone identifier. */
  timezone?: string;
  /** The UTC offset of the timezone, in minutes. */
  timezone_offset?: number;
}

interface Thumbnail {
  /** The served URL of the picture thumbnail. */
  src: string;
  /** The original URL of the image. */
  original?: string;
}

interface PostalAddress {
  /** The type identifying a postal address. The value is always PostalAddress. */
  type: 'PostalAddress';
  /** The country associated with the location. */
  country?: string;
  /** The postal code associated with the location. */
  postalCode?: string;
  /** The street address associated with the location. */
  streetAddress?: string;
  /** The region associated with the location. This is usually a state. */
  addressRegion?: string;
  /** The address locality or subregion associated with the location. */
  addressLocality?: string;
  /** The displayed address string. */
  displayAddress: string;
}

export interface OpeningHours {
  /** The current day opening hours. Can have two sets of opening hours. */
  current_day?: DayOpeningHours[];
  /** The opening hours for the whole week. */
  days?: DayOpeningHours[] | [DayOpeningHours][];
}

interface Contact {
  /** The email address. */
  email?: string;
  /** The telephone number. */
  telephone?: string;
}

interface Rating {
  /** The current value of the rating. */
  ratingValue: number;
  /** Best rating received. */
  bestRating: number;
  /** The number of reviews associated with the rating. */
  reviewCount?: number;
  /** The profile associated with the rating. */
  profile?: Profile;
  /** Whether the rating is coming from Tripadvisor. */
  is_tripadvisor: boolean;
}

interface Unit {
  /** The quantity of the unit. */
  value: number;
  /** The name of the unit associated with the quantity. */
  units: string;
}

interface DataProvider {
  /** The type representing the source of data. This is usually external. */
  type: 'external';
  /** The name of the data provider. This can be a domain. */
  name: string;
  /** The URL where the information is coming from. */
  url: string;
  /** The long name for the data provider. */
  long_name?: string;
  /** The served URL for the image data. */
  img?: string;
}

interface Reviews {
  /** A list of trip advisor reviews for the entity. */
  results: TripAdvisorReview[];
  /** A URL to a web page where more information on the result can be seen. */
  viewMoreUrl: string;
  /** Any reviews available in a foreign language. */
  reviews_in_foreign_language: boolean;
}

interface PictureResults {
  /** A URL to view more pictures. */
  viewMoreUrl?: string;
  /** A list of thumbnail results. */
  results: Thumbnail[];
}

interface Action {
  /** The type representing the action. */
  type: string;
  /** A URL representing the action to be taken. */
  url: string;
}

interface LocationWebResult extends Result {
  /** Aggregated information about the URL. */
  meta_url: MetaUrl;
}

interface MetaUrl {
  /** The protocol scheme extracted from the URL. */
  scheme: string;
  /** The network location part extracted from the URL. */
  netloc: string;
  /** The lowercased domain name extracted from the URL. */
  hostname?: string;
  /** The favicon used for the URL. */
  favicon: string;
  /** The hierarchical path of the URL useful as a display string. */
  path: string;
}

export interface DayOpeningHours {
  /** A short string representing the day of the week. */
  abbr_name: string;
  /** A full string representing the day of the week. */
  full_name: string;
  /** A 24 hr clock time string for the opening time of the business on a particular day. */
  opens: string;
  /** A 24 hr clock time string for the closing time of the business on a particular day. */
  closes: string;
}

interface TripAdvisorReview {
  /** The title of the review. */
  title: string;
  /** A description seen in the review. */
  description: string;
  /** The date when the review was published. */
  date: string;
  /** A rating given by the reviewer. */
  rating: Rating;
  /** The author of the review. */
  author: Person;
  /** A URL link to the page where the review can be found. */
  review_url: string;
  /** The language of the review. */
  language: string;
}

interface Person extends Omit<Thing, 'type'> {
  /** A type identifying a person. The value is always person. */
  type: 'person';
  /** Email address of the person. */
  email?: string;
}

interface Thing {
  /** A type identifying a thing. The value is always thing. */
  type: 'thing';
  /** The name of the thing. */
  name: string;
  /** A URL for the thing. */
  url?: string;
  /** Thumbnail associated with the thing. */
  thumbnail?: Thumbnail;
}
