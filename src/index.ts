#!/usr/bin/env node
import { getOptions } from './config.js';
import { stdioServer, httpServer } from './protocols/index.js';

async function main() {
  const options = getOptions();

  if (!options) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  // stdio requires explicit request
  if (options.transport === 'stdio') {
    await stdioServer.start();
    return;
  }

  // default to http server
  httpServer.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
