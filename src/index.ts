#!/usr/bin/env node
import { bootstrap } from 'global-agent';
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  bootstrap();
}
import { getOptions } from './config.js';
import { stdioServer, httpServer } from './protocols/index.js';

async function main() {
  const options = getOptions();

  if (!options) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  // default to http server
  if (!options.transport || options.transport === 'http') {
    httpServer.start();
    return;
  }

  // stdio requires explicit request
  if (options.transport === 'stdio') {
    await stdioServer.start();
    return;
  }

  console.error('Invalid transport');
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
