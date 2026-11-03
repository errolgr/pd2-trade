/**
 * Plugin budgets (PRD §6.2): slot calls time out after SLOT_TIMEOUT_MS and render late with a skeleton; every
 * failure or timeout counts, and FAILURE_LIMIT within FAILURE_WINDOW_MS auto-disables the plugin.
 */
export const SLOT_TIMEOUT_MS = 300;
export const COMMAND_TIMEOUT_MS = 5000;
export const FAILURE_LIMIT = 5;
export const FAILURE_WINDOW_MS = 10 * 60 * 1000;
/** Watchdog: a worker that does not answer a ping within WATCHDOG_TIMEOUT_MS is terminated (runaway loop). */
export const WATCHDOG_INTERVAL_MS = 5000;
export const WATCHDOG_TIMEOUT_MS = 2000;
/** Notifications per plugin per window. */
export const NOTIFY_LIMIT = 3;
export const NOTIFY_WINDOW_MS = 60 * 1000;

export type FailureKind = 'timeout' | 'crash' | 'invalid-ui';

export class FailureTracker {
  private readonly times: number[] = [];

  constructor(
    private readonly limit = FAILURE_LIMIT,
    private readonly windowMs = FAILURE_WINDOW_MS,
  ) {}

  /** Records a failure at `now`; true once `limit` failures fall inside the window. */
  record(now: number): boolean {
    this.times.push(now);
    while (this.times.length && this.times[0] <= now - this.windowMs) this.times.shift();
    return this.times.length >= this.limit;
  }

  get count(): number {
    return this.times.length;
  }

  reset(): void {
    this.times.length = 0;
  }
}

/** Sliding-window limiter (notifications). */
export class RateLimiter {
  private readonly times: number[] = [];

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  tryTake(now: number): boolean {
    while (this.times.length && this.times[0] <= now - this.windowMs) this.times.shift();
    if (this.times.length >= this.limit) return false;
    this.times.push(now);
    return true;
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}
