export interface LlmContextApiResponse {
  /** Grounding data containing extracted content from web pages. */
  grounding: LlmContextGrounding;
  /** Source metadata keyed by URL. */
  sources: Record<string, LlmContextSource>;
}

export interface LlmContextGrounding {
  /** A list of generic grounding results with extracted content. */
  generic: LlmContextGroundingEntry[];
  /** Point of interest data for location-sensitive queries. */
  poi: LlmContextPoi | null;
  /** Map results for location-sensitive queries. */
  map: LlmContextMapEntry[];
}

export interface LlmContextGroundingEntry {
  /** The source URL of the grounding result. */
  url: string;
  /** The title of the source page. */
  title: string;
  /** Extracted text snippets relevant to the query. */
  snippets: string[];
}

export interface LlmContextPoi {
  /** The name of the point of interest. */
  name?: string;
  /** The address of the point of interest. */
  address?: string;
  /** The phone number of the point of interest. */
  phone?: string;
  /** The rating of the point of interest. */
  rating?: number;
  /** The number of reviews for the point of interest. */
  review_count?: number;
  /** The price range of the point of interest. */
  price_range?: string;
}

export interface LlmContextMapEntry {
  /** The URL associated with the map result. */
  url?: string;
  /** The title of the map result. */
  title?: string;
}

export interface LlmContextSource {
  /** The title of the source page. */
  title: string;
  /** The hostname of the source. */
  hostname: string;
  /** Modification date information as an array of date representations. */
  age: string[] | null;
}

export type FormattedLlmContextResults = {
  url: string;
  title: string;
  snippets: string[];
}[];
