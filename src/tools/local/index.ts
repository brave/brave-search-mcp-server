import type {
  LocationResult,
  LocationDescription,
  OpeningHours,
  DayOpeningHours,
} from './types.js';
import webParams, { type QueryParams as WebQueryParams } from '../web/params.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import API from '../../BraveAPI/index.js';
import { formatWebResults } from '../web/index.js';
import { stringify } from '../../utils.js';
import { type WebSearchApiResponse } from '../web/types.js';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const name = 'brave_local_search';

export const annotations: ToolAnnotations = {
  title: 'Brave Local Search',
  openWorldHint: true,
};

export const description = `
    Brave Local Search API provides enrichments for location search results. Access to this API is available only through the Brave Search API Pro plans; confirm the user's plan before using this tool (if the user does not have a Pro plan, use the brave_web_search tool). Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc.
    
    Returns detailed information including:
        - Business names and addresses
        - Ratings and review counts
        - Phone numbers and opening hours

    Use this when the query implies 'near me', 'in my area', or mentions specific locations (e.g., 'in San Francisco'). This tool automatically falls back to brave_web_search if no local results are found.
`;

// Access to Local API is available through the Pro plans.
export const execute = async (params: WebQueryParams) => {
  // Make sure both 'web' and 'locations' are in the result_filter
  params = { ...params, result_filter: [...(params.result_filter || []), 'web', 'locations'] };

  // Starts with a web search to retrieve potential location IDs
  const { locations, web: web_fallback } = await API.issueRequest<'web'>('web', params);

  // We can send up to 20 location IDs at a time to the Local API
  // TODO (Sampson): Add support for multiple requests
  const locationIDs = (locations?.results || []).map((poi) => poi.id as string).slice(0, 20);

  // No locations were found - user's plan may not include access to the Local API
  if (!locations || locationIDs.length === 0) {
    // If we have web results, but no locations, we'll fall back to the web results
    if (web_fallback && web_fallback.results.length > 0) {
      return buildFallbackWebResponse(web_fallback);
    }

    // If we have no web results, we'll send a message to the user
    return {
      content: [
        {
          type: 'text' as const,
          text: "No location data was returned. User's plan does not support local search, or the query may be unclear.",
        },
      ],
    };
  }

  // Fetch AI-generated descriptions
  const descriptions = await API.issueRequest<'localDescriptions'>('localDescriptions', {
    ids: locationIDs,
  });

  return {
    content: formatLocalResults(locations.results, descriptions.results).map((formattedPOI) => ({
      type: 'text' as const,
      text: formattedPOI,
    })),
  };
};

export const register = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    name,
    {
      title: name,
      description: description,
      inputSchema: webParams.shape,
      annotations: annotations,
    },
    execute
  );
};

const buildFallbackWebResponse = (web_fallback: WebSearchApiResponse['web']): CallToolResult => {
  if (!web_fallback || web_fallback.results.length === 0) throw new Error('No web results found');

  const fallback = {
    content: [
      {
        type: 'text' as const,
        text: "No location data was returned. Either the user's plan does not support local search, or the API was unable to find locations for the provided query. Falling back to general web search.",
      },
    ],
  };

  for (const web_result of formatWebResults(web_fallback)) {
    fallback.content.push({
      type: 'text' as const,
      text: stringify(web_result),
    });
  }

  return fallback;
};

const formatLocalResults = (
  poisData: LocationResult[],
  descData: LocationDescription[] = []
): string[] => {
  return poisData.map((poi) => {
    return stringify({
      name: poi.title,
      price_range: poi.price_range,
      phone: poi.contact?.telephone,
      rating: poi.rating?.ratingValue,
      hours: formatOpeningHours(poi.opening_hours),
      rating_count: poi.rating?.reviewCount,
      description: descData.find(({ id }) => id === poi.id)?.description,
      address: poi.postal_address?.displayAddress,
    });
  });
};

const formatOpeningHours = (openingHours?: OpeningHours): Record<string, string> | undefined => {
  if (!openingHours) return undefined;
  /**
   * Response will be something like {
   *     'sunday': '10:00-18:00',
   *     'monday': '10:00-18:00',
   *     'tuesday': '10:00-18:00',
   *     'wednesday': '10:00-18:00, 19:00-22:00',
   *     'thursday': '10:00-18:00',
   *     'friday': '10:00-18:00',
   *     'saturday': '12:00-18:00',
   * }
   */
  const today: DayOpeningHours[] = openingHours.current_day || [];
  const response = {} as Record<string, string>;

  const dayHours: [string, string[]][] = [
    [
      `today (${today[0].full_name.toLowerCase()})`,
      today.map(({ opens, closes }) => `${opens}-${closes}`),
    ],
  ];

  // Add the rest of the days to the response
  for (let parts of openingHours.days || []) {
    // Not all days have arrays of hours, so normalize to an array
    if (!Array.isArray(parts)) parts = [parts];

    // Add the hours for each day to the response
    for (const { full_name, opens, closes } of parts) {
      const dayName = full_name.toLowerCase();
      const existingEntry = dayHours.find(([name]) => name === dayName);

      existingEntry
        ? existingEntry[1].push(`${opens}-${closes}`)
        : dayHours.push([dayName, [`${opens}-${closes}`]]);
    }
  }

  for (const [name, hours] of dayHours) {
    response[name] = hours.join(', ');
  }

  return response;
};

export default {
  name,
  description,
  annotations,
  inputSchema: webParams.shape,
  execute,
  register,
};
