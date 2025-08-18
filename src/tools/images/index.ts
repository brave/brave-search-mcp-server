import type {
  ImageContent,
  TextContent,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';
import params, { type QueryParams } from './params.js';
import API from '../../BraveAPI/index.js';
import { stringify } from '../../utils.js';

export const name = 'brave_image_search';

export const annotations: ToolAnnotations = {
  title: 'Brave Image Search',
  openWorldHint: true,
};

export const description = `
    Performs an image search using the Brave Search API. Helpful for when you need pictures of people, places, or things, ideas for graphic design, inspiration for art, or anything else where images are useful. When relaying the results in a markdown-supporting environment, it is helpful to include some/all of the images in the results. Example: ![Image Description](image_url).
`;

export const execute = async (params: QueryParams) => {
  const content: (TextContent | ImageContent)[] = [];
  const response = await API.issueRequest<'images'>('images', params);

  for (const { url: page_url, title, thumbnail, properties } of response.results) {
    // Skip results without an image
    if (!thumbnail?.src) continue;

    // Prefer property URL as it is the shortest-possible URL
    const image_url = properties?.url ?? thumbnail.src;
    const fetched_image = await fetchImage(image_url);

    if (fetched_image) {
      const { mimeType, data } = fetched_image;

      content.push(
        { type: 'text', text: stringify({ title, page_url, image_url }) },
        { type: 'image', mimeType, data }
      );
    }
  }

  return { content, isError: false };
};

async function fetchImage(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: response.headers.get('content-type') ?? 'image/jpeg',
    };
  } catch (error) {
    return null;
  }
}

export default {
  name,
  description,
  annotations,
  inputSchema: params.shape,
  execute,
};
