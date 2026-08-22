import { readFileSync } from 'node:fs';
import { RATE_LIMIT } from './constants.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let rateLimitQueue: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

/** Default gap between Brave Search API calls (free tier is 1 req/sec). */
export const DEFAULT_MIN_REQUEST_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT.perSecond);

export function resetRateLimitState() {
  rateLimitQueue = Promise.resolve();
  lastRequestStartedAt = 0;
}

/**
 * Serializes outbound API calls so we don't blow past the Search API's
 * per-second cap when an agent fires a few tools at once.
 */
export async function waitForRateLimit(intervalMs: number): Promise<void> {
  if (intervalMs <= 0) {
    return;
  }

  const run = async () => {
    const waitMs = lastRequestStartedAt + intervalMs - Date.now();
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestStartedAt = Date.now();
  };

  const next = rateLimitQueue.then(run, run);
  rateLimitQueue = next;
  await next;
}

export function parseRetryAfterMs(header: string | null, fallbackMs: number): number {
  if (!header) {
    return fallbackMs;
  }

  const trimmed = header.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Math.round(Number.parseFloat(trimmed) * 1000));
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return fallbackMs;
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

/** Non-negative integer milliseconds. `0` disables throttling. */
export function parseIntervalMs(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || value > 60_000) {
      return null;
    }
    return value;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  if (parsed < 0 || parsed > 60_000) {
    return null;
  }

  return parsed;
}
