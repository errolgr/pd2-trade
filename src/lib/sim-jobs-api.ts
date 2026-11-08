/**
 * Read-only Horadric Sim data for the overlay's Sim panel (PD2 token as bearer): job status (`GET /api/sim/jobs/mine`)
 * and a finished report's result card (`GET /api/sim/reports/:slug/card`). The overlay never starts, stops or edits
 * sims and never computes a number; it only shows what the user runs on pd2trader.com, as stored there.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import type { SimGoal } from '@/lib/sim-preferences';

export type SimJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface SimJobStatus {
  id: string;
  goal: SimGoal;
  character: string | null;
  status: SimJobState;
  progress: { done: number; total: number } | null;
  queuePosition: number | null;
  etaSeconds: number | null;
  source: 'overlay' | 'website';
  /** User-safe one-line message when failed. */
  error: string | null;
  /** Absolute pd2trader.com report link when succeeded. */
  reportUrl: string | null;
  headline: string[];
  createdAt: string;
  finishedAt: string | null;
}

export class SimJobsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SimJobsApiError';
  }
}

export function isActiveJob(job: SimJobStatus): boolean {
  return job.status === 'queued' || job.status === 'running';
}

/** Active jobs (newest first), then jobs finished in the last 24 hours; at most 20. */
export async function getMySimJobs(token: string, signal?: AbortSignal): Promise<SimJobStatus[]> {
  const response = await fetch(`${BACKEND_URL}/api/sim/jobs/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new SimJobsApiError(`pd2trader.com answered ${response.status}`, response.status);
  const body = (await response.json()) as { jobs?: SimJobStatus[] };
  return Array.isArray(body?.jobs) ? body.jobs : [];
}

/** An item named on a result card; `marketQuery` is set when the market tracks it (unique and set items). */
export interface SimItemRef {
  name: string;
  base: string | null;
  quality: string | null;
  /** The website's "View on market" link fragment; null when not marketable. */
  marketQuery: string | null;
}

export interface SimSlotChange {
  slot: string;
  from: SimItemRef | null;
  to: SimItemRef;
  source: 'equipped' | 'stash' | 'candidate';
}

export interface SimUpgrade {
  slot: string;
  item: SimItemRef;
  gainPct: number;
}

/** Percentages (`gainPct`, `ciPct`, `vsPreviousPct`, weights' `pct`) are in percent; `share` is 0..1. */
export type SimCardBody =
  | {
      goal: 'quick_sim';
      dps: number;
      ciPct: number | null;
      killTimeSec: number | null;
      sources: { label: string; share: number }[];
      vsPreviousPct: number | null;
    }
  | {
      goal: 'top_gear';
      baseDps: number;
      bestDps: number;
      gainPct: number;
      ciPct: number | null;
      setsSimmed: number;
      changes: SimSlotChange[];
    }
  | { goal: 'upgrade_finder'; baseDps: number; upgrades: SimUpgrade[] }
  | {
      goal: 'stat_weights';
      weights: { label: string; pct: number }[];
      /** `target` is null when the report doesn't hold the stat's current total. */
      nextBreakpoint: { stat: string; target: number | null; needed: number; gainPct: number } | null;
    }
  | {
      goal: 'skill_charm_optimizer';
      gainPct: number;
      skillMoves: { from: string; to: string; points: number }[];
      /** `from` null: a charm to add; `to` null: a charm to drop. */
      charmSwaps: { from: string | null; to: string | null }[];
    };

/** `GET /api/sim/reports/:slug/card`: a finished report's headline numbers, all read from the stored report. */
export interface SimReportCard {
  slug: string;
  goal: SimGoal;
  character: string | null;
  /** Human label, e.g. "Uber Tristram"; null when the job behind the report is gone. */
  scenario: string | null;
  reportUrl: string;
  plannerUrl: string | null;
  createdAt: string;
  card: SimCardBody;
}

/** The report slug of a pd2trader.com report link (`…/sim/r/<slug>`); null for any other link. */
export function reportSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const match = /^\/sim\/r\/([^/]+)\/?$/.exec(new URL(url).pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** The server has no card for this report (e.g. a compare job without a single-profile DPS). */
export const CARD_UNSUPPORTED = 'card_unsupported';

/** One report's card; throws SimJobsApiError (`message` CARD_UNSUPPORTED when the report has no card). */
export async function getSimReportCard(token: string, slug: string, signal?: AbortSignal): Promise<SimReportCard> {
  const response = await fetch(`${BACKEND_URL}/api/sim/reports/${encodeURIComponent(slug)}/card`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    let code: string | undefined;
    try {
      code = ((await response.json()) as { code?: string })?.code;
    } catch {
      // non-JSON error body
    }
    throw new SimJobsApiError(
      code === CARD_UNSUPPORTED ? CARD_UNSUPPORTED : `pd2trader.com answered ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as SimReportCard;
}
