/** Wait used when a 429 carries no usable Retry-After. */
export const DEFAULT_RETRY_AFTER_MS = 5000;

/** True when an API error is PD2 rate limiting (HTTP 429), whatever shape the error took. */
export function isRateLimited(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ('status' in err && err.status === 429) return true;
  if ('statusCode' in err && err.statusCode === 429) return true;
  return 'message' in err && typeof err.message === 'string' && /API Error: 429\b/.test(err.message);
}

/** How long to wait before retrying a rate-limited call, or null when `err` isn't a 429. */
export function rateLimitDelayMs(err: unknown): number | null {
  if (!isRateLimited(err)) return null;
  const retryAfter = typeof err === 'object' && err !== null && 'retryAfterMs' in err ? err.retryAfterMs : undefined;
  return typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter
    : DEFAULT_RETRY_AFTER_MS;
}

/** Retry-After header (delta seconds or HTTP date) in ms; null when absent or unparseable. */
export function parseRetryAfter(header: string | null | undefined, now: number = Date.now()): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}
