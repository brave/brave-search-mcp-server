import { LoggingLevel, LoggingLevelSchema } from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config({ debug: false, quiet: true });

// Config schema for Smithery.ai
export const configSchema = z.object({
  braveApiKey: z.string().describe('Your API key'),
  loggingLevel: z
    .enum(LoggingLevelSchema.options)
    .default('info')
    .describe('Desired logging level')
    .optional(),
});

export type SmitheryConfig = z.infer<typeof configSchema>;

type Configuration = {
  transport: 'stdio' | 'http';
  port: number;
  host: string;
  braveApiKey: string;
  loggingLevel: LoggingLevel;
};

const state: Configuration & { ready: boolean } = {
  transport: 'stdio',
  port: 8080,
  host: '0.0.0.0',
  braveApiKey: process.env.BRAVE_API_KEY ?? '',
  loggingLevel: 'info',
  ready: false,
};

export function getOptions(): Configuration | false {
  const program = new Command()
    .option('--brave-api-key <string>', 'Brave API key', process.env.BRAVE_API_KEY ?? '')
    .option('--logging-level <string>', 'Logging level', process.env.BRAVE_MCP_LOG_LEVEL ?? 'info')
    .option(
      '--transport <stdio|http>',
      'transport type',
      process.env.BRAVE_MCP_TRANSPORT ?? 'stdio'
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
    .allowUnknownOption()
    .parse(process.argv);

  const options = program.opts();

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

  // Update state
  state.braveApiKey = options.braveApiKey;
  state.transport = options.transport;
  state.port = options.port;
  state.host = options.host;
  state.loggingLevel = options.loggingLevel;
  state.ready = true;

  return options as Configuration;
}

export function setOptions(options: SmitheryConfig) {
  return Object.assign(state, options);
}

export default state;
