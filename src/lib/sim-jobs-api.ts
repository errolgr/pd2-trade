/**
 * Read-only Horadric Sim job status for the overlay's Sim panel: `GET /api/sim/jobs/mine` (PD2 token as bearer).
 * The overlay never starts, stops or edits sims; it only shows what the user runs on pd2trader.com.
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
