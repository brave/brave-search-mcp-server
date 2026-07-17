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

export function parseDelimitedList(value: string | string[] | undefined | null): string[] {
  if (value == null) return [];

  // Value may be variadic as string[]. Normalize to a single string first.
  const raw = Array.isArray(value) ? value.join(' ') : value;

  return raw
    .split(/[\s,]+/)
    .map((o: string) => o.trim())
    .filter((o: string) => o.length > 0);
}

function isIpv4Loopback(value: string): boolean {
  // Check complete range of loopback addresses: 127.0.0.0/8
  const parts = value.split('.');
  return (
    parts.length === 4 &&
    parts[0] === '127' &&
    parts.every((part: string) => {
      if (!/^\d+$/.test(part)) return false;
      // Leading zeros are not allowed.
      if (part.length > 1 && part.startsWith('0')) return false;
      // Parse the part as an integer and check if it's in the range 0-255.
      const num = Number.parseInt(part, 10);
      return num >= 0 && num <= 255;
    })
  );
}

// Determines whether a bare hostname refers to the loopback interface: any
// IPv4 127.0.0.0/8 address, the IPv6 loopback (::1), or "localhost".
export function isLoopbackHostname(value: string): boolean {
  return value === 'localhost' || value === '::1' || isIpv4Loopback(value);
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
