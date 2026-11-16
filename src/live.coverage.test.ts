import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Guards that every tool has a live E2E case. A tool counts only when
 * src/live.e2e.ts imports its `name` and passes that binding to it() or
 * describe(). The registered name string never appears in that file.
 *
 * Assumes one directory level under src/tools, an `export const name` in each
 * index.ts, and no exemptions: a case that skips at runtime still has to exist.
 * describe() counts the same as it(). If the live suite stops importing `name`
 * or stops passing those bindings into it()/describe(), update this scanner
 * and those patterns together. Runs in `npm test`, so a missing API key
 * cannot skip it.
 */
const toolsDir = join(import.meta.dirname, 'tools');
const liveSource = readFileSync(join(import.meta.dirname, 'live.e2e.ts'), 'utf8');

/**
 * Local binding for each tool directory's imported `name`, keyed by directory,
 * e.g. `place_search` -> `placeSearch`. Only the exact shape
 * `import { name as X } from './tools/<dir>/index.js'` is recognized.
 */
const aliasByDirectory = new Map(
  Array.from(
    liveSource.matchAll(
      /import\s*\{\s*name\s+as\s+(\w+)\s*\}\s*from\s*['"]\.\/tools\/([^'"/]+)\/index\.js['"]/g
    ),
    ([, alias, directory]) => [directory, alias]
  )
);

/** True when that binding is passed to it() or describe(). Nested cases under a describe(tool) do not need their own call. */
const callsAlias = (alias: string): boolean =>
  new RegExp(String.raw`\b(?:it|describe)\(\s*${alias}\b`).test(liveSource);

/**
 * Scans only the index.ts directly inside each src/tools directory and returns
 * one line per coverage gap: no `name` export, no import in live.e2e.ts, or an
 * import that is never passed to it()/describe().
 */
const coverageGaps = (): string[] => {
  const gaps: string[] = [];

  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const indexPath = join(toolsDir, entry.name, 'index.ts');
    if (!existsSync(indexPath)) continue;

    const displayPath = `src/tools/${entry.name}/index.ts`;
    const exported = readFileSync(indexPath, 'utf8').match(/export const name = ['"]([^'"]+)['"]/);

    if (!exported) {
      gaps.push(`  ${displayPath}: no \`export const name = '...'\``);
      continue;
    }

    const name = exported[1];
    const alias = aliasByDirectory.get(entry.name);

    if (alias === undefined) {
      gaps.push(
        `  ${name} (${displayPath}): no \`import { name as X } from './tools/${entry.name}/index.js'\``
      );
    } else if (!callsAlias(alias)) {
      gaps.push(
        `  ${name} (${displayPath}): imported as ${alias} but not passed to it() or describe()`
      );
    }
  }

  return gaps;
};

describe('live API coverage', () => {
  it('calls every src/tools entry from src/live.e2e.ts', () => {
    const gaps = coverageGaps();

    assert.deepEqual(gaps, [], `Live coverage gaps in src/live.e2e.ts:\n${gaps.join('\n')}`);
  });
});
