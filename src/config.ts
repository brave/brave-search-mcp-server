import { LoggingLevel, LoggingLevelSchema } from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import dotenv from 'dotenv';
import tools from './tools/index.js';
import { parsePort, readBraveApiKeyFromFile } from './utils.js';

dotenv.config({ debug: false, quiet: true });

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
  allowedHosts: string[];
};

const state: Configuration & { ready: boolean } = {
  transport: 'stdio',
  port: 8080,
  // Bind to loopback by default. The HTTP transport is unauthenticated, so binding to
  // 0.0.0.0 exposes it to other hosts on the network. Deployments that intentionally
  // expose it (e.g. behind a gateway) can set --host/BRAVE_MCP_HOST explicitly.
  host: '127.0.0.1',
  braveApiKey: process.env.BRAVE_API_KEY ?? '',
  loggingLevel: 'info',
  ready: false,
  enabledTools: [],
  disabledTools: [],
  stateless: false,
  allowedHosts: [],
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
      '--brave-api-key-file <string>',
      'Path to file containing Brave API key',
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
      process.env.BRAVE_MCP_HOST ?? '127.0.0.1'
    )
    .option(
      '--allowed-hosts <hosts...>',
      'Host header values accepted by the HTTP transport (DNS-rebinding protection). ' +
        'Defaults to the bind host plus loopback; set this for proxied/remote deployments.',
      process.env.BRAVE_MCP_ALLOWED_HOSTS?.trim()
        .split(/[\s,]+/)
        .filter(Boolean) ?? []
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

  const apiKeyFile =
    typeof options.braveApiKeyFile === 'string' ? options.braveApiKeyFile.trim() : '';
  let braveApiKey = typeof options.braveApiKey === 'string' ? options.braveApiKey.trim() : '';

  if (apiKeyFile) {
    const apiKeyFromFile = readBraveApiKeyFromFile(apiKeyFile);
    if (!apiKeyFromFile.ok) {
      console.error(`Error: ${apiKeyFromFile.error}`);
      return false;
    }

    braveApiKey = apiKeyFromFile.key;
  }

  if (!braveApiKey) {
    console.error(
      'Error: A Brave API key is required via --brave-api-key, BRAVE_API_KEY, --brave-api-key-file, or BRAVE_API_KEY_FILE. You can get one at https://brave.com/search/api/.'
    );
    return false;
  }

  if (options.transport === 'http') {
    const port = parsePort(options.port);
    if (port === null) {
      console.error(
        `Invalid --port value: '${options.port}'. Must be a valid port number between 1 and 65535.`
      );
      return false;
    }
    options.port = port;

    if (!options.host) {
      console.error('Error: --host is required');
      return false;
    }

    // Build the Host-header allowlist (DNS-rebinding protection). Always include the
    // bind host and loopback so the documented local usage works out of the box; any
    // additional names (e.g. a public domain behind a gateway) come from --allowed-hosts.
    const configuredAllowedHosts = parseToolNameList(options.allowedHosts);
    options.allowedHosts = [
      ...new Set([
        `${options.host}:${port}`,
        `127.0.0.1:${port}`,
        `localhost:${port}`,
        ...configuredAllowedHosts,
      ]),
    ];
  }

  // Normalize stateless to boolean (CLI passes it as string)
  options.stateless = options.stateless === true || options.stateless === 'true';
  options.braveApiKey = braveApiKey;

  // Update state
  state.braveApiKey = braveApiKey;
  state.transport = options.transport;
  state.port = options.port;
  state.host = options.host;
  state.loggingLevel = options.loggingLevel;
  state.enabledTools = enabledTools;
  state.disabledTools = disabledTools;
  state.stateless = options.stateless;
  state.allowedHosts = Array.isArray(options.allowedHosts) ? options.allowedHosts : [];
  state.ready = true;

  return options as Configuration;
}

export default state;
