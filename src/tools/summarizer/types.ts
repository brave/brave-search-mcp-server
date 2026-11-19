export interface SummarizerSearchApiResponse {
  /** The type of summarizer search API result. The value is always summarizer. */
  type: 'summarizer';
  /** The current status of summarizer for the given key. The value can be either failed or complete. */
  status: string;
  /** The title for the summary. */
  title?: string;
  /** Details for the summary message. */
  summary?: SummaryMessage[];
  /** Enrichments that can be added to the summary message. */
  enrichments?: SummaryEnrichments;
  /** Followup queries relevant to the current query. */
  followups?: string[];
  /** Details on the entities in the summary message. */
  entities_infos?: Record<string, SummaryEntityInfo>;
}

/** One part of a summary message, identified by its type. */
export type SummaryMessage =
  /** A text excerpt from the summary. */
  | { type: 'token'; data: string }
  /** The beginning of a list of entities: `ol` for an ordered list, `ul` for an unordered one. */
  | { type: 'enum_start'; data: 'ol' | 'ul' }
  /** An entity in the list. */
  | { type: 'enum_item'; data: SummaryEntity }
  /** The end of the list of entities. */
  | { type: 'enum_end'; data?: undefined }
  /** An inline reference, sent when the inline_references query param is set. */
  | { type: 'inline_reference'; data: SummaryInlineReference };

interface TextLocation {
  /** The 0-based index, where the important part of the text starts. */
  start: number;
  /** The 0-based index, where the important part of the text ends. */
  end: number;
}

export interface SummaryEntity {
  /** A unique identifier for the entity. */
  uuid: string;
  /** The name of the entity. */
  name: string;
  /** The URL where further details on the entity can be found. */
  url?: string;
  /** A text message describing the entity. */
  text?: string;
  /** The image associated with the entity. */
  images?: SummaryImage[];
  /** The location of the entity in the summary message. */
  highlight?: TextLocation[];
}

interface SummaryInlineReference {
  /** The type of inline reference. The value is always inline_reference. */
  type: string;
  /** The URL that is being referenced. */
  url: string;
  /** The start index of the inline reference in the summary message. */
  start_index: number;
  /** The end index of the inline reference in the summary message. */
  end_index: number;
  /** The ordinal number of the inline reference. */
  number: number;
  /** The favicon of the URL that is being referenced. */
  favicon?: string;
  /** The reference text snippet. */
  snippet?: string;
}

interface Thumbnail {
  /** The served URL of the picture thumbnail. */
  src: string;
  /** The original URL of the image. */
  original?: string;
}

interface ImageProperties {
  /** The image URL. */
  url: string;
}

interface Image {
  /** The thumbnail associated with the image. */
  thumbnail: Thumbnail;
  /** The URL of the image. */
  url?: string;
  /** Metadata on the image. */
  properties?: ImageProperties;
}

interface SummaryImage extends Image {
  /** Text associated with the image. */
  text?: string;
}

interface SummaryEnrichments {
  /** The raw summary message. */
  raw: string;
  /** The images associated with the summary. */
  images?: SummaryImage[];
  /** The answers in the summary message. */
  qa?: SummaryAnswer[];
  /** The entities in the summary message. */
  entities?: SummaryEntity[];
  /** References based on which the summary was built. */
  context?: SummaryContext[];
}

interface SummaryAnswer {
  /** The answer text. */
  answer: string;
  /** A score associated with the answer. */
  score?: number;
  /** The location of the answer in the summary message. */
  highlight?: TextLocation;
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

interface SummaryContext {
  /** The title of the reference. */
  title: string;
  /** The URL where the reference can be found. */
  url: string;
  /** Details on the URL associated with the reference. */
  meta_url?: MetaUrl;
}

interface SummaryEntityInfo {
  /** The name of the provider. */
  provider?: string;
  /** Description of the entity. */
  description?: string;
}
