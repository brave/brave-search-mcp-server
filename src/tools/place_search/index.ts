import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
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
    Searches Brave's Place Search API. A single call may populate any combination of 'results' (POIs), 'cities', 'addresses', 'streets', and 'location' (the resolved search area), depending on the query's shape.

    When to use:
        - POIs near coordinates or a named area (e.g. "coffee shops in Paris") -> 'results', each with structured business data (postal address, hours, contact, ratings, photos, categories, timezone).
        - Browsing general POIs (omit 'query'; supply 'latitude'+'longitude' or 'location').
        - Disambiguating a bare city name (e.g. "springfield") -> 'cities'.
        - Resolving a specific address (e.g. "350 5th avenue" with NYC coords) -> 'addresses' (often plus 'streets').
        - Looking up a street by name (e.g. "michigan avenue" with Chicago coords) -> 'streets'.

    Inputs:
        - Anchor the search via 'latitude'+'longitude' or 'location' (or both). With neither, 'query' is required.
        - 'addresses' / 'streets' only surface when the query is address-/street-shaped AND geographically anchored.
        - 'location' format: US -- '<city> <state> <country>' (e.g. 'san francisco ca united states'); non-US -- '<city> <country>' (e.g. 'tokyo japan'). Capitalization and commas don't matter.
        - 'count' caps results (max 50, default 20). 'radius' (meters) biases toward closer results; it does NOT hard-limit the search area.
`.trim();

export const execute = async (params: QueryParams) => {
  const parsedParams = RequestParamsSchema.parse(params);
  const parsedHeaders = RequestHeadersSchema.parse(params);

  const response = await API.issueRequest<'placeSearch'>(
    'placeSearch',
    parsedParams,
    parsedHeaders
  );

  return {
    content: [{ type: 'text', text: JSON.stringify(response) } as TextContent],
    isError: false,
    structuredContent: response,
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
