import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListToolsRequestSchema,
  type ListToolsResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodRawShape } from 'zod';
import tools from './tools/index.js';

// The dialect servers MUST emit by default, per SEP-1613 §5.
const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

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

// An absent `$schema` defaults to 2020-12 but says nothing about which keywords
// were emitted, so only an explicit declaration counts.
const needsRetargeting = (schema?: Tool['inputSchema'] | Tool['outputSchema']): boolean =>
  (schema as { $schema?: string } | undefined)?.$schema !== JSON_SCHEMA_2020_12;

/**
 * SDK 1.x hardcodes draft-07 and emits array-form `items` for tuples, which is
 * invalid 2020-12 (`brave_place_search`'s coordinates). SDK v2 gets both right,
 * so this decays to a string comparison and can then be deleted.
 * https://github.com/modelcontextprotocol/typescript-sdk/issues/1057
 */
const retargetDialect = (tool: Tool): void => {
  const shapes = schemaShapesByTool.get(tool.name);

  if (!shapes) return;

  if (shapes.inputSchema && needsRetargeting(tool.inputSchema)) {
    tool.inputSchema = toJsonSchema2020(shapes.inputSchema, 'input');
  }

  if (shapes.outputSchema && tool.outputSchema && needsRetargeting(tool.outputSchema)) {
    tool.outputSchema = toJsonSchema2020(shapes.outputSchema, 'output');
  }
};

/**
 * Rewrites `additionalProperties: {}` to the equivalent `true`. Zod emits the
 * empty-object form for every loose object with no way to change it, and some
 * clients misread it - Claude Code normalizes it to `false`, inverting it.
 * https://github.com/anthropics/claude-code/issues/78673
 */
const preferBooleanAdditionalProperties = (node: unknown): void => {
  if (Array.isArray(node)) {
    for (const entry of node) preferBooleanAdditionalProperties(entry);
    return;
  }

  if (node === null || typeof node !== 'object') return;

  const schema = node as Record<string, unknown>;

  for (const [keyword, value] of Object.entries(schema)) {
    const isEmptySchema =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0;

    if (keyword === 'additionalProperties' && isEmptySchema) {
      schema[keyword] = true;
      continue;
    }

    preferBooleanAdditionalProperties(value);
  }
};

type ListToolsHandler = (request: unknown, extra: unknown) => Promise<ListToolsResult>;

/** Post-processes `tools/list` schemas. Call after all tools are registered. */
export default function normalizeAdvertisedSchemas(mcpServer: McpServer): void {
  const requestHandlers = (
    mcpServer.server as unknown as { _requestHandlers?: Map<string, ListToolsHandler> }
  )._requestHandlers;

  const listTools = requestHandlers?.get('tools/list');

  // Reachable only through SDK internals; if a future version moves it, advertise
  // unmodified rather than fail to start - server.test.ts catches the fallout.
  if (!listTools) return;

  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const result = await listTools(request, extra);

    for (const tool of result.tools) {
      retargetDialect(tool);
      preferBooleanAdditionalProperties(tool.inputSchema);
      preferBooleanAdditionalProperties(tool.outputSchema);
    }

    return result;
  });
}
