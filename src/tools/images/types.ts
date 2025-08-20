export interface ImageSearchApiResponse {
  /** The type of search API result. The value is always images. */
  type: 'images';
  /** Image search query string. */
  query: Query;
  /** The list of image results for the given query. */
  results: ImageResult[];
  /** Additional information about the image search results. */
  extra: Extra;
}

interface Query {
  /** The original query that was requested. */
  original: string;
  /** The altered query by the spellchecker. This is the query that is used to search. */
  altered?: string;
  /** Whether the spellchecker is enabled or disabled. */
  spellcheck_off?: boolean;
  /** The value is true if the lack of results is due to a strict safesearch setting. Adult content relevant to the query was found, but was blocked by safesearch. */
  show_strict_warning?: string;
}

export interface ImageResult {
  /** The type of image search API result. The value is always image_result. */
  type: 'image_result';
  /** The title of the image. */
  title?: string;
  /** The original page URL where the image was found. */
  url?: string;
  /** The source domain where the image was found. */
  source?: string;
  /** The ISO date time when the page was last fetched. The format is YYYY-MM-DDTHH:MM:SSZ. */
  page_fetched?: string;
  /** The thumbnail for the image. */
  thumbnail?: Thumbnail;
  /** Metadata for the image. */
  properties?: Properties;
  /** Aggregated information on the URL associated with the image search result. */
  meta_url?: MetaUrl;
  /** The confidence level for the image result. */
  confidence?: 'low' | 'medium' | 'high';
}

interface Thumbnail {
  /** The served URL of the image. */
  src?: string;
  /** The width of the thumbnail. */
  width?: number;
  /** The height of the thumbnail. */
  height?: number;
}

export interface Properties {
  /** The image URL. */
  url?: string;
  /** The lower resolution placeholder image URL. */
  placeholder?: string;
  /** The width of the image. */
  width?: number;
  /** The height of the image. */
  height?: number;
}

interface MetaUrl {
  /** The protocol scheme extracted from the URL. */
  scheme?: string;
  /** The network location part extracted from the URL. */
  netloc?: string;
  /** The lowercased domain name extracted from the URL. */
  hostname?: string;
  /** The favicon used for the URL. */
  favicon?: string;
  /** The hierarchical path of the URL useful as a display string. */
  path?: string;
}

interface Extra {
  /** Indicates whether the image search results might contain offensive content. */
  might_be_offensive: boolean;
}
