import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import API from '../../BraveAPI/index.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  RequestParamsSchema,
  RequestHeadersSchema,
  PlaceSearchInputSchema,
  type PlaceSearchInput as QueryParams,
} from './schemas/input.js';
import { PlaceSearchApiResponseSchema } from './schemas/output.js';

export const name = 'brave_place_search';

export const annotations: ToolAnnotations = {
  title: 'Brave Place Search',
  openWorldHint: true,
};

export const description = `
    Searches for points of interest (POIs) in a specified geographic area using Brave's Place Search API. Each result includes rich, structured data such as the place's name, URL, postal address, opening hours, contact info, ratings, photos, categories, and timezone.

    When to use:
        - Finding places near a set of coordinates or a named location (e.g. "coffee shops near me", "bookstores in Paris")
        - Browsing general points of interest in an area when no query is supplied
        - Building a place-finding experience that needs structured business data (hours, ratings, etc.)
        - Augmenting an answer with the location's address, phone number, or rating

    Provide a search area via 'latitude' + 'longitude' or a 'location' string (or both). When neither is provided, a 'query' is expected. Use 'count' to keep responses small (max 50, default 20).

    For US locations the recommended 'location' format is '<city> <state> <country name>' (e.g. 'san francisco ca united states'); for non-US locations use '<city> <country name>' (e.g. 'tokyo japan').
`.trim();

export const execute = async (params: QueryParams) => {
  const parsedParams = RequestParamsSchema.parse(params);
  const parsedHeaders = RequestHeadersSchema.parse(params);

  const response = await API.issueRequest<'placeSearch'>(
    'placeSearch',
    parsedParams,
    parsedHeaders
  );
  const parsed = PlaceSearchApiResponseSchema.safeParse(response);
  const payload = parsed.success ? parsed.data : response;

  return {
    content: [{ type: 'text', text: JSON.stringify(payload) } as TextContent],
    isError: false,
    structuredContent: payload,
  };
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: PlaceSearchInputSchema.shape,
      outputSchema: PlaceSearchApiResponseSchema.shape,
      annotations: annotations,
    },
    execute
  );
};

export default {
  name,
  description,
  annotations,
  inputSchema: PlaceSearchInputSchema.shape,
  outputSchema: PlaceSearchApiResponseSchema.shape,
  execute,
  register,
};
