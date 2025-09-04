#!/usr/bin/env node
import { getOptions } from './config.js';
import { stdioServer, httpServer } from './protocols/index.js';

async function main() {
  const options = getOptions();

  if (!options) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  // default to stdio server unless http is explicitly requested
  if (options.transport === 'http') {
    httpServer.start();
    return;
  }

  await stdioServer.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
