import { readFileSync } from 'node:fs';
import { RATE_LIMIT } from './constants.js';

let requestCount = {
  second: 0,
  month: 0,
  lastReset: Date.now(),
};

export function checkRateLimit() {
  const now = Date.now();
  if (now - requestCount.lastReset > 1000) {
    requestCount.second = 0;
    requestCount.lastReset = now;
  }
  if (requestCount.second >= RATE_LIMIT.perSecond || requestCount.month >= RATE_LIMIT.perMonth) {
    throw new Error('Rate limit exceeded');
  }
  requestCount.second++;
  requestCount.month++;
}

export function stringify(data: any, pretty = false) {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export type ReadBraveApiKeyFromFileResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

export function readBraveApiKeyFromFile(filePath: string): ReadBraveApiKeyFromFileResult {
  try {
    const key = readFileSync(filePath, 'utf8').trim();
    if (key.length === 0) {
      return { ok: false, error: `API key file is empty: ${filePath}` };
    }

    return { ok: true, key };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Unable to read API key file '${filePath}': ${reason}` };
  }
}

export function parsePort(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      return null;
    }
    return value;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  if (parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}
