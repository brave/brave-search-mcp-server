export type FormattedWebResults = {
  url: string;
  title: string;
  description?: string;
  extra_snippets?: string[];
}[];

export type FormattedFAQResults = {
  question: string;
  answer: string;
  title: string;
  url: string;
}[];

export type FormattedDiscussionsResults = {
  mutated_by_goggles?: boolean;
  url: string;
  data?: ForumData;
}[];

export type FormattedNewsResults = {
  mutated_by_goggles?: boolean;
  source?: string;
  breaking: boolean;
  is_live: boolean;
  age?: string;
  url: string;
  title: string;
  description?: string;
  extra_snippets?: string[];
}[];

export type FormattedVideoResults = {
  mutated_by_goggles?: boolean;
  url: string;
  title: string;
  description?: string;
  age?: string;
  thumbnail_url?: string;
  duration?: string;
  view_count?: string;
  creator?: string;
  publisher?: string;
  tags?: string[];
}[];

export interface WebSearchApiResponse {
  /** The type of web search API result. The value is always search. */
  type: 'search';
  /** Discussions clusters aggregated from forum posts that are relevant to the query. */
  discussions?: Discussions;
  /** Frequently asked questions that are relevant to the search query. */
  faq?: FAQ;
  /** Aggregated information on an entity showable as an infobox. */
  infobox?: GraphInfobox;
  /** Places of interest (POIs) relevant to location sensitive queries. */
  locations?: Locations;
  /** Preferred ranked order of search results. */
  mixed?: MixedResponse;
  /** News results relevant to the query. */
  news?: News;
  /** Search query string and its modifications that are used for search. */
  query?: Query;
  /** Videos relevant to the query. */
  videos?: Videos;
  /** Web search results relevant to the query. */
  web?: Search;
  /** Summary key to get summary results for the query. */
  summarizer?: Summarizer;
  /** Callback information for rich results. */
  rich?: RichCallbackInfo;
}

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

interface Query {
  /** The original query that was requested. */
  original: string;
  /** Whether there is more content available for query, but the response was restricted due to safesearch. */
  show_strict_warning?: boolean;
  /** The altered query for which the search was performed. */
  altered?: string;
  /** Whether safesearch was enabled. */
  safesearch?: boolean;
  /** Whether the query is a navigational query to a domain. */
  is_navigational?: boolean;
  /** Whether the query has location relevance. */
  is_geolocal?: boolean;
  /** Whether the query was decided to be location sensitive. */
  local_decision?: string;
  /** The index of the location. */
  local_locations_idx?: number;
  /** Whether the query is trending. */
  is_trending?: boolean;
  /** Whether the query has news breaking articles relevant to it. */
  is_news_breaking?: boolean;
  /** Whether the query requires location information for better results. */
  ask_for_location?: boolean;
  /** The language information gathered from the query. */
  language?: Language;
  /** Whether the spellchecker was off. */
  spellcheck_off?: boolean;
  /** The country that was used. */
  country?: string;
  /** Whether there are bad results for the query. */
  bad_results?: boolean;
  /** Whether the query should use a fallback. */
  should_fallback?: boolean;
  /** The gathered location latitutde associated with the query. */
  lat?: string;
  /** The gathered location longitude associated with the query. */
  long?: string;
  /** The gathered postal code associated with the query. */
  postal_code?: string;
  /** The gathered city associated with the query. */
  city?: string;
  /** The gathered state associated with the query. */
  state?: string;
  /** The country for the request origination. */
  header_country?: string;
  /** Whether more results are available for the given query. */
  more_results_available?: boolean;
  /** Any custom location labels attached to the query. */
  custom_location_label?: string;
  /** Any reddit cluster associated with the query. */
  reddit_cluster?: string;
}

export interface Discussions {
  /** The type identifying a discussion cluster. Currently the value is always search. */
  type: 'search';
  /** A list of discussion results. */
  results: DiscussionResult[];
  /** Whether the discussion results are changed by a Goggle. The value is false by default. */
  mutated_by_goggles: boolean;
}

interface DiscussionResult extends Omit<SearchResult, 'type'> {
  /** The discussion result type identifier. The value is always discussion. */
  type: 'discussion';
  /** The enriched aggregated data for the relevant forum post. */
  data?: ForumData;
}

export interface ForumData {
  /** The name of the forum. */
  forum_name: string;
  /** The number of answers to the post. */
  num_answers?: number;
  /** The score of the post on the forum. */
  score?: string;
  /** The title of the post on the forum. */
  title?: string;
  /** The question asked in the forum post. */
  question?: string;
  /** The top-rated comment under the forum post. */
  top_comment?: string;
}

export interface FAQ {
  /** The FAQ result type identifier. The value is always faq. */
  type: 'faq';
  /** A list of aggregated question answer results relevant to the query. */
  results: QA[];
}

interface QA {
  /** The question being asked. */
  question: string;
  /** The answer to the question. */
  answer: string;
  /** The title of the post. */
  title: string;
  /** The URL pointing to the post. */
  url: string;
  /** Aggregated information about the URL. */
  meta_url?: MetaUrl;
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

export interface Search {
  /** A type identifying web search results. The value is always search. */
  type: 'search';
  /** A list of search results. */
  results: SearchResult[];
  /** Whether the results are family friendly. */
  family_friendly: boolean;
}

export interface SearchResult extends Result {
  /** A type identifying a web search result. The value is always search_result. */
  type: 'search_result';
  /** A sub type identifying the web search result type. */
  subtype: 'generic';
  /** Whether the web search result is currently live. Default value is false. */
  is_live: boolean;
  /** Gathered information on a web search result. */
  deep_results?: DeepResult;
  /** A list of schemas (structured data) extracted from the page. The schemas try to follow schema.org and will return anything we can extract from the HTML that can fit into these models. */
  schemas?: [][];
  /** Aggregated information on the URL associated with the web search result. */
  meta_url?: MetaUrl;
  /** The thumbnail of the web search result. */
  thumbnail?: Thumbnail;
  /** A string representing the age of the web search result. */
  age?: string;
  /** The main language on the web search result. */
  language: string;
  /** The location details if the query relates to a restaurant. */
  location?: LocationResult;
  /** The video associated with the web search result. */
  video?: VideoData;
  /** The movie associated with the web search result. */
  movie?: MovieData;
  /** Any frequently asked questions associated with the web search result. */
  faq?: FAQ;
  /** Any question answer information associated with the web search result page. */
  qa?: QAPage;
  /** Any book information associated with the web search result page. */
  book?: Book;
  /** Rating found for the web search result page. */
  rating?: Rating;
  /** An article found for the web search result page. */
  article?: Article;
  /** The main product and a review that is found on the web search result page. */
  product?: Product | Review;
  /** A list of products and reviews that are found on the web search result page. */
  product_cluster?: Product | Review[];
  /** A type representing a cluster. The value can be product_cluster. */
  cluster_type?: string;
  /** A list of web search results. */
  cluster?: Result[];
  /** Aggregated information on the creative work found on the web search result. */
  creative_work?: CreativeWork;
  /** Aggregated information on music recording found on the web search result. */
  music_recording?: MusicRecording;
  /** Aggregated information on the review found on the web search result. */
  review?: Review;
  /** Aggregated information on a software product found on the web search result page. */
  software?: Software;
  /** Aggregated information on a recipe found on the web search result page. */
  recipe?: Recipe;
  /** Aggregated information on a organization found on the web search result page. */
  organization?: Organization;
  /** The content type associated with the search result page. */
  content_type?: string;
  /** A list of extra alternate snippets for the web search result. */
  extra_snippets?: string[];
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

interface AbstractGraphInfobox extends Result {
  /** The infobox result type identifier. The value is always infobox. */
  type: 'infobox';
  /** The position on a search result page. */
  position: number;
  /** Any label associated with the entity. */
  label?: string;
  /** Category classification for the entity. */
  category?: string;
  /** A longer description for the entity. */
  long_desc?: string;
  /** The thumbnail associated with the entity. */
  thumbnail?: Thumbnail;
  /** A list of attributes about the entity. */
  attributes?: string[][];
  /** The profiles associated with the entity. */
  profiles?: Profile[] | DataProvider[];
  /** The official website pertaining to the entity. */
  website_url?: string;
  /** Any ratings given to the entity. */
  ratings?: Rating[];
  /** A list of data sources for the entity. */
  providers?: DataProvider[];
  /** A unit representing quantity relevant to the entity. */
  distance?: Unit;
  /** A list of images relevant to the entity. */
  images?: Thumbnail[];
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  movie?: MovieData;
}

interface GenericInfobox extends AbstractGraphInfobox {
  /** The infobox subtype identifier. The value is always generic. */
  subtype: 'generic';
  /** List of URLs where the entity was found. */
  found_in_urls?: string[];
}

interface EntityInfobox extends AbstractGraphInfobox {
  /** The infobox subtype identifier. The value is always entity. */
  subtype: 'entity';
}

interface QAInfobox extends AbstractGraphInfobox {
  /** The infobox subtype identifier. The value is always code. */
  subtype: 'code';
  /** The question and relevant answer. */
  data: QAPage;
  /** Detailed information on the page containing the question and relevant answer. */
  meta_url?: MetaUrl;
}

interface InfoboxWithLocation extends AbstractGraphInfobox {
  /** The infobox subtype identifier. The value is always location. */
  subtype: 'location';
  /** Whether the entity a location. */
  is_location: boolean;
  /** The coordinates of the location. */
  coordinates?: number[];
  /** The map zoom level. */
  zoom_level: number;
  /** The location result. */
  location?: LocationResult;
}

interface InfoboxPlace extends AbstractGraphInfobox {
  /** The infobox subtype identifier. The value is always place. */
  subtype: 'place';
  /** The location result. */
  location: LocationResult;
}

interface GraphInfobox {
  /** The type identifier for infoboxes. The value is always graph. */
  type: 'graph';
  /** A list of infoboxes associated with the query. */
  results: GenericInfobox | QAInfobox | InfoboxPlace | InfoboxWithLocation | EntityInfobox;
}

interface QAPage {
  /** The question that is being asked. */
  question: string;
  /** An answer to the question. */
  answer: Answer;
}

interface Answer {
  /** The main content of the answer. */
  text: string;
  /** The name of the author of the answer. */
  author?: string;
  /** Number of upvotes on the answer. */
  upvoteCount?: number;
  /** The number of downvotes on the answer. */
  downvoteCount?: number;
}

interface Thumbnail {
  /** The served URL of the picture thumbnail. */
  src: string;
  /** The original URL of the image. */
  original?: string;
}

interface LocationWebResult extends Result {
  /** Aggregated information about the URL. */
  meta_url: MetaUrl;
}

interface LocationResult extends Result {
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
  /** The UTC offset of the timezone, in minutes from UTC. */
  timezone_offset?: number;
}

interface LocationDescription {
  /** The type of a location description. The value is always local_description. */
  type: 'local_description';
  /** A Temporary id of the location with this description. */
  id: string;
  /** AI generated description of the location with the given id. */
  description?: string;
}

interface Locations {
  /** Location type identifier. The value is always locations. */
  type: 'locations';
  /** An aggregated list of location sensitive results. */
  results: LocationResult[];
}

interface MixedResponse {
  /** The type representing the model mixed. The value is always mixed. */
  type: 'mixed';
  /** The ranking order for the main section of the search result page. */
  main?: ResultReference[];
  /** The ranking order for the top section of the search result page. */
  top?: ResultReference[];
  /** The ranking order for the side section of the search result page. */
  side?: ResultReference[];
}

interface ResultReference {
  /** The type of the result. */
  type: string;
  /** The 0th based index where the result should be placed. */
  index?: number;
  /** Whether to put all the results from the type at specific position. */
  all: boolean;
}

export interface Videos {
  /** The type representing the videos. The value is always videos. */
  type: 'videos';
  /** A list of video results. */
  results: VideoResult[];
  /** Whether the video results are changed by a Goggle. The value is false by default. */
  mutated_by_goggles?: boolean;
}

export interface News {
  /** The type representing the news. The value is always news. */
  type: 'news';
  /** A list of news results. */
  results: NewsResult[];
  /** Whether the news results are changed by a Goggle. The value is false by default. */
  mutated_by_goggles?: boolean;
}

interface NewsResult extends Result {
  /** The aggregated information on the URL representing a news result. */
  meta_url?: MetaUrl;
  /** The source of the news. */
  source?: string;
  /** Whether the news result is currently a breaking news. */
  breaking: boolean;
  /** Whether the news result is currently live. */
  is_live: boolean;
  /** The thumbnail associated with the news result. */
  thumbnail?: Thumbnail;
  /** A string representing the age of the news article. */
  age?: string;
  /** A list of extra alternate snippets for the news search result. */
  extra_snippets?: string[];
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

interface OpeningHours {
  /** The current day opening hours. Can have two sets of opening hours. */
  current_day?: DayOpeningHours[];
  /** The opening hours for the whole week. */
  days?: DayOpeningHours[] | [DayOpeningHours][];
}

interface DayOpeningHours {
  /** A short string representing the day of the week. */
  abbr_name: string;
  /** A full string representing the day of the week. */
  full_name: string;
  /** A 24 hr clock time string for the opening time of the business on a particular day. */
  opens: string;
  /** A 24 hr clock time string for the closing time of the business on a particular day. */
  closes: string;
}

interface Contact {
  /** The email address. */
  email?: string;
  /** The telephone number. */
  telephone?: string;
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

interface Unit {
  /** The quantity of the unit. */
  value: number;
  /** The name of the unit associated with the quantity. */
  units: string;
}

interface MovieData {
  /** Name of the movie. */
  name?: string;
  /** A short plot summary for the movie. */
  description?: string;
  /** A URL serving a movie profile page. */
  url?: string;
  /** A thumbnail for a movie poster. */
  thumbnail?: Thumbnail;
  /** The release date for the movie. */
  release?: string;
  /** A list of people responsible for directing the movie. */
  directors?: Person[];
  /** A list of actors in the movie. */
  actors?: Person[];
  /** Rating provided to the movie from various sources. */
  rating?: Rating;
  /** The runtime of the movie. The format is HH:MM:SS. */
  duration?: string;
  /** List of genres in which the movie can be classified. */
  genre?: string[];
  /** The query that resulted in the movie result. */
  query?: string;
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

interface Person extends Omit<Thing, 'type'> {
  /** A type identifying a person. The value is always person. */
  type: 'person';
  /** Email address of the person. */
  email?: string;
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

interface Book {
  /** The title of the book. */
  title: string;
  /** The author of the book. */
  author: Person[];
  /** The publishing date of the book. */
  date?: string;
  /** The price of the book. */
  price?: Price;
  /** The number of pages in the book. */
  pages?: number;
  /** The publisher of the book. */
  publisher?: Person;
  /** A gathered rating from different sources associated with the book. */
  rating?: Rating;
}

interface Price {
  /** The price value in a given currency. */
  price: string;
  /** The current of the price value. */
  price_currency: string;
}

interface Article {
  /** The author of the article. */
  author?: Person[];
  /** The date when the article was published. */
  date?: string;
  /** The name of the publisher for the article. */
  publisher?: Organization;
  /** A thumbnail associated with the article. */
  thumbnail?: Thumbnail;
  /** Whether the article is free to read or is behind a paywall. */
  isAccessibleForFree?: boolean;
}

interface ContactPoint extends Omit<Thing, 'type'> {
  /** A type string identifying a contact point. The value is always contact_point. */
  type: 'contact_point';
  /** The telephone number of the entity. */
  telephone?: string;
  /** The email address of the entity. */
  email?: string;
}

interface Organization extends Omit<Thing, 'type'> {
  /** A type string identifying an organization. The value is always organization. */
  type: 'organization';
  /** A list of contact points for the organization. */
  contact_points?: ContactPoint[];
}

interface HowTo {
  /** The how to text. */
  text: string;
  /** A name for the how to. */
  name?: string;
  /** A URL associated with the how to. */
  url?: string;
  /** A list of image URLs associated with the how to. */
  image?: string[];
}

interface Recipe {
  /** The title of the recipe. */
  title: string;
  /** The description of the recipe. */
  description: string;
  /** A thumbnail associated with the recipe. */
  thumbnail: Thumbnail;
  /** The URL of the web page where the recipe was found. */
  url: string;
  /** The domain of the web page where the recipe was found. */
  domain: string;
  /** The URL for the favicon of the web page where the recipe was found. */
  favicon: string;
  /** The total time required to cook the recipe. */
  time?: string;
  /** The preparation time for the recipe. */
  prep_time?: string;
  /** The cooking time for the recipe. */
  cook_time?: string;
  /** Ingredients required for the recipe. */
  ingredients?: string;
  /** List of instructions for the recipe. */
  instructions?: HowTo[];
  /** How many people the recipe serves. */
  servings?: number;
  /** Calorie count for the recipe. */
  calories?: number;
  /** Aggregated information on the ratings associated with the recipe. */
  rating?: Rating;
  /** The category of the recipe. */
  recipeCategory?: string;
  /** The cuisine classification for the recipe. */
  recipeCuisine?: string;
  /** Aggregated information on the cooking video associated with the recipe. */
  video?: VideoData;
}

interface Product {
  /** A string representing a product type. The value is always product. */
  type: 'Product';
  /** The name of the product. */
  name: string;
  /** The category of the product. */
  category?: string;
  /** The price of the product. */
  price: string;
  /** A thumbnail associated with the product. */
  thumbnail: Thumbnail;
  /** The description of the product. */
  description?: string;
  /** A list of offers available on the product. */
  offers?: Offer[];
  /** A rating associated with the product. */
  rating?: Rating;
}

interface Offer {
  /** The URL where the offer can be found. */
  url: string;
  /** The currency in which the offer is made. */
  priceCurrency: string;
  /** The price of the product currently on offer. */
  price: string;
}

interface Review {
  /** A string representing review type. This is always review. */
  type: 'review';
  /** The review title for the review. */
  name: string;
  /** The thumbnail associated with the reviewer. */
  thumbnail: Thumbnail;
  /** A description of the review (the text of the review itself). */
  description: string;
  /** The ratings associated with the review. */
  rating: Rating;
}

interface Reviews {
  /** A list of trip advisor reviews for the entity. */
  results: TripAdvisorReview[];
  /** A URL to a web page where more information on the result can be seen. */
  viewMoreUrl: string;
  /** Any reviews available in a foreign language. */
  reviews_in_foreign_language: boolean;
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

interface CreativeWork {
  /** The name of the creative work. */
  name: string;
  /** A thumbnail associated with the creative work. */
  thumbnail: Thumbnail;
  /** A rating that is given to the creative work. */
  rating?: Rating;
}

interface MusicRecording {
  /** The name of the song or album. */
  name: string;
  /** A thumbnail associated with the music. */
  thumbnail?: Thumbnail;
  /** The rating of the music. */
  rating?: Rating;
}

interface Software {
  /** The name of the software product. */
  name?: string;
  /** The author of software product. */
  author?: string;
  /** The latest version of the software product. */
  version?: string;
  /** The code repository where the software product is currently available or maintained. */
  codeRepository?: string;
  /** The home page of the software product. */
  homepage?: string;
  /** The date when the software product was published. */
  datePublisher?: string;
  /** Whether the software product is available on npm. */
  is_npm?: boolean;
  /** Whether the software product is available on pypi. */
  is_pypi?: boolean;
  /** The number of stars on the repository. */
  stars?: number;
  /** The numbers of forks of the repository. */
  forks?: number;
  /** The programming language spread on the software product. */
  ProgrammingLanguage?: string;
}

interface DeepResult {
  /** A list of news results associated with the result. */
  news?: NewsResult[];
  /** A list of buttoned results associated with the result. */
  buttons?: ButtonResult[];
  /** Videos associated with the result. */
  videos?: VideoResult[];
  /** Images associated with the result. */
  images?: Image[];
}

interface VideoResult extends Result {
  /** The type identifying the video result. The value is always video_result. */
  type: 'video_result';
  /** Meta data for the video. */
  video: VideoData;
  /** Aggregated information on the URL. */
  meta_url?: MetaUrl;
  /** The thumbnail of the video. */
  thumbnail?: Thumbnail;
  /** A string representing the age of the video. */
  age?: string;
}

interface VideoData {
  /** A time string representing the duration of the video. The format can be HH:MM:SS or MM:SS. */
  duration?: string;
  /** The number of views of the video. */
  views?: string;
  /** The creator of the video. */
  creator?: string;
  /** The publisher of the video. */
  publisher?: string;
  /** A thumbnail associated with the video. */
  thumbnail?: Thumbnail;
  /** A list of tags associated with the video. */
  tags?: string[];
  /** Author of the video. */
  author?: Profile;
  /** Whether the video requires a subscription to watch. */
  requires_subscription?: boolean;
}

interface ButtonResult {
  /** A type identifying button result. The value is always button_result. */
  type: 'button_result';
  /** The title of the result. */
  title: string;
  /** The URL for the button result. */
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

interface Language {
  /** The main language seen in the string. */
  main: string;
}

interface ImageProperties {
  /** The original image URL. */
  url: string;
  /** The URL for a better quality resized image. */
  resized: string;
  /** The placeholder image URL. */
  placeholder: string;
  /** The image height. */
  height?: number;
  /** The image width. */
  width?: number;
  /** The image format. */
  format?: string;
  /** The image size. */
  content_size?: string;
}

interface Summarizer {
  /** The value is always summarizer. */
  type: 'summarizer';
  /** The key for the summarizer API. */
  key: string;
}

interface RichCallbackInfo {
  /** The value is always rich. */
  type: 'rich';
  /** The hint for the rich result. */
  hint?: RichCallbackHint;
}

interface RichCallbackHint {
  /** The name of the vertical of the rich result. */
  vertical: string;
  /** The callback key for the rich result. */
  callback_key: string;
}
