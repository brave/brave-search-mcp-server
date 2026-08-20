import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListToolsRequestSchema,
  type ListToolsResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodRawShape } from 'zod';
import tools from './tools/index.js';

/**
 * The dialect servers MUST emit by default, per SEP-1613 §5.
 * https://modelcontextprotocol.io/seps/1613-establish-json-schema-2020-12-as-default-dialect-f
 */
export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

type ToolSchemaShapes = {
  inputSchema?: ZodRawShape;
  outputSchema?: ZodRawShape;
};

const schemaShapesByTool = new Map<string, ToolSchemaShapes>(
  Object.values(tools).map((tool) => [tool.name, tool as ToolSchemaShapes])
);

const toJsonSchema2020 = (shape: ZodRawShape, io: 'input' | 'output'): Tool['inputSchema'] =>
  z.toJSONSchema(z.object(shape), {
    target: 'draft-2020-12',
    io,
  }) as unknown as Tool['inputSchema'];

type ListToolsHandler = (request: unknown, extra: unknown) => Promise<ListToolsResult>;

// An absent `$schema` defaults to 2020-12, but says nothing about which dialect's
// keywords were emitted, so only an explicit declaration counts as correct.
const needsRetargeting = (schema?: Tool['inputSchema'] | Tool['outputSchema']): boolean =>
  (schema as { $schema?: string } | undefined)?.$schema !== JSON_SCHEMA_2020_12;

/**
 * Re-emits advertised tool schemas as 2020-12, skipping any the SDK already got
 * right - so this decays to a string comparison once the SDK is fixed, and can
 * then be deleted.
 *
 * The SDK hardcodes draft-07 (`mcp.js` calls `toJsonSchemaCompat()` with no
 * `target`), which 2020-12-only clients reject outright, and whose array-form
 * `items` is invalid 2020-12 (`brave_place_search`'s coordinates tuple).
 * Wrapping its handler preserves the other fields it emits.
 *
 * https://github.com/modelcontextprotocol/typescript-sdk/issues/2084 (PR #2085)
 *
 * Must be called after all tools are registered.
 */
export default function enforce2020Dialect(mcpServer: McpServer): void {
  const requestHandlers = (
    mcpServer.server as unknown as { _requestHandlers?: Map<string, ListToolsHandler> }
  )._requestHandlers;

  const listTools = requestHandlers?.get('tools/list');

  // Only reachable through SDK internals; if a future version moves it, leave its
  // output alone rather than failing to start - server.test.ts catches regressions.
  if (!listTools) return;

  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const result = await listTools(request, extra);

    for (const tool of result.tools) {
      const shapes = schemaShapesByTool.get(tool.name);

      if (!shapes) continue;

      if (shapes.inputSchema && needsRetargeting(tool.inputSchema)) {
        tool.inputSchema = toJsonSchema2020(shapes.inputSchema, 'input');
      }

      if (shapes.outputSchema && tool.outputSchema && needsRetargeting(tool.outputSchema)) {
        tool.outputSchema = toJsonSchema2020(shapes.outputSchema, 'output');
      }
    }

    return result;
  });
}
