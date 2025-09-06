import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import params, { type QueryParams } from './params.js';
import API from '../../BraveAPI/index.js';
import type {
  Discussions,
  FAQ,
  News,
  Search,
  Videos,
  FormattedFAQResults,
  FormattedDiscussionsResults,
  FormattedNewsResults,
  FormattedVideoResults,
  FormattedWebResults,
} from './types.js';
import { stringify } from '../../utils.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const name = 'brave_web_search';

export const annotations: ToolAnnotations = {
  title: 'Brave Web Search',
  openWorldHint: true,
};

export const description = `
    Performs web searches using the Brave Search API and returns comprehensive search results with rich metadata.

    When to use:
        - General web searches for information, facts, or current topics
        - Location-based queries (restaurants, businesses, points of interest)
        - News searches for recent events or breaking stories
        - Finding videos, discussions, or FAQ content
        - Research requiring diverse result types (web pages, images, reviews, etc.)

    Returns a JSON list of web results with title, description, and URL.
    
    When the "results_filter" parameter is empty, JSON results may also contain FAQ, Discussions, News, and Video results.
`;

export const execute = async (params: QueryParams) => {
  const response = { content: [] as TextContent[], isError: false };
  const { web, faq, discussions, news, videos, summarizer } = await API.issueRequest<'web'>(
    'web',
    params
  );

  if (summarizer) {
    response.content.push({
      type: 'text' as const,
      text: `Summarizer key: ${summarizer.key}`,
    });
  }

  if (!web || !Array.isArray(web.results) || web.results.length < 1) {
    response.isError = true;
    response.content.push({
      type: 'text' as const,
      text: 'No web results found',
    });

    return response;
  }

  // TODO (Sampson): The following is unnecessarily repetitive.
  if (web && web.results?.length > 0) {
    for (const entry of formatWebResults(web)) {
      response.content.push({
        type: 'text' as const,
        text: stringify(entry),
      });
    }
  }

  if (faq && faq.results?.length > 0) {
    for (const entry of formatFAQResults(faq)) {
      response.content.push({
        type: 'text' as const,
        text: stringify(entry),
      });
    }
  }

  if (discussions && discussions.results?.length > 0) {
    for (const entry of formatDiscussionsResults(discussions)) {
      response.content.push({
        type: 'text' as const,
        text: stringify(entry),
      });
    }
  }

  if (news && news.results?.length > 0) {
    for (const entry of formatNewsResults(news)) {
      response.content.push({
        type: 'text' as const,
        text: stringify(entry),
      });
    }
  }

  if (videos && videos.results?.length > 0) {
    for (const entry of formatVideoResults(videos)) {
      response.content.push({
        type: 'text' as const,
        text: stringify(entry),
      });
    }
  }

  return response;
};

export const formatWebResults = (web: Search): FormattedWebResults => {
  return (web.results || []).map(({ url, title, description, extra_snippets }) => ({
    url,
    title,
    description,
    extra_snippets,
  }));
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: params.shape,
      annotations: annotations,
    },
    execute
  );
};

const formatFAQResults = (faq: FAQ): FormattedFAQResults => {
  return (faq.results || []).map(({ question, answer, title, url }) => ({
    question,
    answer,
    title,
    url,
  }));
};

const formatDiscussionsResults = (discussions: Discussions): FormattedDiscussionsResults => {
  return (discussions.results || []).map(({ url, data }) => ({
    mutated_by_goggles: discussions.mutated_by_goggles,
    url,
    data,
  }));
};

const formatNewsResults = (news: News): FormattedNewsResults => {
  return (news.results || []).map(
    ({ source, breaking, is_live, age, url, title, description, extra_snippets }) => ({
      mutated_by_goggles: news.mutated_by_goggles,
      source,
      breaking,
      is_live,
      age,
      url,
      title,
      description,
      extra_snippets,
    })
  );
};

const formatVideoResults = (videos: Videos): FormattedVideoResults => {
  return (videos.results || []).map(({ url, age, title, description, video, thumbnail }) => ({
    mutated_by_goggles: videos.mutated_by_goggles,
    url,
    title,
    description,
    age,
    thumbnail_url: thumbnail?.src,
    duration: video.duration,
    view_count: video.views,
    creator: video.creator,
    publisher: video.publisher,
    tags: video.tags,
  }));
};

export default {
  name,
  description,
  annotations,
  inputSchema: params.shape,
  execute,
  register,
};
