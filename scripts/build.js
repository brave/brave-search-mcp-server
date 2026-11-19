// Replaces `rm -rf dist && tsc && chmod +x dist/*.js` so one script
// suffices for both Windows and Unix developers.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

fs.rmSync('dist', { recursive: true, force: true });

// Running the project's TypeScript through Node needs no shell for the
// Windows .cmd shim and never picks up a global tsc.
const tscPath = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const tsc = spawnSync(process.execPath, [tscPath], { stdio: 'inherit' });

if (tsc.error) {
  console.error(tsc.error);
  process.exit(1);
}

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

for (const name of fs.readdirSync('dist')) {
  if (name.endsWith('.js')) {
    fs.chmodSync(path.join('dist', name), 0o755);
  }
}
