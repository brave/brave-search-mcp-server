import fs from 'node:fs';
import { LoggingLevel, LoggingLevelSchema } from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import dotenv from 'dotenv';
import tools from './tools/index.js';

dotenv.config({ debug: false, quiet: true });

/**
 * Reads the Brave Search API key from a file. Used to support Docker
 * secrets and similar setups where mounting a file is preferred over
 * passing the key via an environment variable or CLI argument.
 *
 * Returns an empty string if `filePath` is empty/undefined. Throws if the
 * file is set but cannot be read, so the user gets a clear failure
 * instead of a silently empty key.
 */
function readApiKeyFromFile(filePath: string | undefined | null): string {
  if (!filePath) return '';
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read Brave API key from "${filePath}": ${message}`);
  }
}

function parseToolNameList(value: string | string[] | undefined | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value))
    return value.map((t: string) => t.trim()).filter((t: string) => t.length > 0);
  return value
    .trim()
    .split(/\s+/)
    .filter((t: string) => t.length > 0);
}

type Configuration = {
  transport: 'stdio' | 'http';
  port: number;
  host: string;
  braveApiKey: string;
  loggingLevel: LoggingLevel;
  enabledTools: string[];
  disabledTools: string[];
  stateless: boolean;
};

const state: Configuration & { ready: boolean } = {
  transport: 'stdio',
  port: 8080,
  host: '0.0.0.0',
  braveApiKey: process.env.BRAVE_API_KEY ?? '',
  loggingLevel: 'info',
  ready: false,
  enabledTools: [],
  disabledTools: [],
  stateless: false,
};

export function isToolPermittedByUser(toolName: string): boolean {
  return state.enabledTools.length > 0
    ? state.enabledTools.includes(toolName)
    : state.disabledTools.includes(toolName) === false;
}

export function getOptions(): Configuration | false {
  const program = new Command()
    .option('--brave-api-key <string>', 'Brave API key', process.env.BRAVE_API_KEY ?? '')
    .option(
      '--brave-api-key-file <path>',
      'Path to a file containing the Brave API key (useful for Docker secrets). ' +
        'Takes precedence over --brave-api-key when set.',
      process.env.BRAVE_API_KEY_FILE ?? ''
    )
    .option('--logging-level <string>', 'Logging level', process.env.BRAVE_MCP_LOG_LEVEL ?? 'info')
    .option(
      '--transport <stdio|http>',
      'transport type',
      process.env.BRAVE_MCP_TRANSPORT ?? 'stdio'
    )
    .option(
      '--enabled-tools <names...>',
      'tools to enable',
      process.env.BRAVE_MCP_ENABLED_TOOLS?.trim().split(' ') ?? []
    )
    .option(
      '--disabled-tools <names...>',
      'tools to disable',
      process.env.BRAVE_MCP_DISABLED_TOOLS?.trim().split(' ') ?? []
    )
    .option(
      '--port <number>',
      'desired port for HTTP transport',
      process.env.BRAVE_MCP_PORT ?? '8080'
    )
    .option(
      '--host <string>',
      'desired host for HTTP transport',
      process.env.BRAVE_MCP_HOST ?? '0.0.0.0'
    )
    .option(
      '--stateless <boolean>',
      'whether the server should be stateless',
      process.env.BRAVE_MCP_STATELESS === 'true' ? true : false
    )
    .allowUnknownOption()
    .parse(process.argv);

  const options = program.opts();
  const toolNames = Object.values(tools).map((tool) => tool.name);

  // Resolve the API key: when --brave-api-key-file (or BRAVE_API_KEY_FILE)
  // is set, read the key from that file. This lets users mount the key as
  // a Docker secret instead of exposing it through an env var or CLI arg.
  if (options.braveApiKeyFile) {
    try {
      options.braveApiKey = readApiKeyFromFile(options.braveApiKeyFile);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // Validate tool inclusion configuration
  const enabledTools = parseToolNameList(options.enabledTools);
  const disabledTools = parseToolNameList(options.disabledTools);

  if (enabledTools.length > 0 && disabledTools.length > 0) {
    console.error('Error: --enabled-tools and --disabled-tools cannot be used together');
    return false;
  }

  const invalidToolNames = [...enabledTools, ...disabledTools].filter(
    (t: string) => !toolNames.includes(t)
  );
  if (invalidToolNames.length > 0) {
    console.error(`Invalid tool name(s) used: ${invalidToolNames.join(', ')}`);
    console.error(`Valid tool names are: ${toolNames.join(', ')}`);
    return false;
  }

  // Validate all other options
  if (!['stdio', 'http'].includes(options.transport)) {
    console.error(
      `Invalid --transport value: '${options.transport}'. Must be one of: stdio, http.`
    );
    return false;
  }

  if (!LoggingLevelSchema.options.includes(options.loggingLevel)) {
    console.error(
      `Invalid --logging-level value: '${options.loggingLevel}'. Must be one of: ${LoggingLevelSchema.options.join(', ')}`
    );
    return false;
  }

  if (!options.braveApiKey) {
    console.error(
      'Error: --brave-api-key is required. You can get one at https://brave.com/search/api/.'
    );
    return false;
  }

  if (options.transport === 'http') {
    if (options.port < 1 || options.port > 65535) {
      console.error(
        `Invalid --port value: '${options.port}'. Must be a valid port number between 1 and 65535.`
      );
      return false;
    }

    if (!options.host) {
      console.error('Error: --host is required');
      return false;
    }
  }

  // Normalize stateless to boolean (CLI passes it as string)
  options.stateless = options.stateless === true || options.stateless === 'true';

  // Update state
  state.braveApiKey = options.braveApiKey;
  state.transport = options.transport;
  state.port = options.port;
  state.host = options.host;
  state.loggingLevel = options.loggingLevel;
  state.enabledTools = enabledTools;
  state.disabledTools = disabledTools;
  state.stateless = options.stateless;
  state.ready = true;

  return options as Configuration;
}

export default state;
