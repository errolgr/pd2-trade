import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, FlaskConical, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimWaitlist } from '@/components/custom/SimWaitlist';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { subscribeIntents } from '@/lib/overlay-intents';
import { getMySimJobs, isActiveJob, type SimJobStatus } from '@/lib/sim-jobs-api';
import { simGoalLabel } from '@/lib/sim-preferences';
import { cn } from '@/lib/utils';
import { useOverlay, usePanel } from '@/overlay';

/** Poll interval while a sim is queued or running. */
export const ACTIVE_POLL_MS = 5_000;
/** Poll interval when nothing is in flight. */
export const IDLE_POLL_MS = 60_000;

export function relativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function etaText(seconds: number): string {
  if (seconds < 60) return `~${Math.max(1, Math.round(seconds))}s left`;
  return `~${Math.round(seconds / 60)}m left`;
}

const jobName = (job: SimJobStatus) =>
  job.character ? `${simGoalLabel(job.goal)} · ${job.character}` : simGoalLabel(job.goal);

function RunningRow({ job }: { job: SimJobStatus }) {
  const pct =
    job.progress && job.progress.total > 0 ? Math.min(100, (job.progress.done / job.progress.total) * 100) : 0;
  const detail =
    job.status === 'queued'
      ? job.queuePosition !== null
        ? `Queued · #${job.queuePosition} in line`
        : 'Queued'
      : job.progress && job.progress.total > 0 && job.progress.done >= job.progress.total
        ? 'Writing report…'
        : job.etaSeconds !== null
          ? etaText(job.etaSeconds)
          : 'Running';
  return (
    <li className="space-y-1.5 rounded-md border border-border/60 p-2.5"
      data-testid="sim-running">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium">{jobName(job)}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {job.source === 'overlay' ? 'from overlay' : 'website'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </li>
  );
}

function RecentRow({ job, now }: { job: SimJobStatus; now: number }) {
  const dot =
    job.status === 'succeeded' ? 'bg-success' : job.status === 'failed' ? 'bg-destructive' : 'bg-muted-foreground';
  const line =
    job.status === 'failed'
      ? (job.error ?? 'Sim failed')
      : job.status === 'cancelled'
        ? 'Cancelled'
        : (job.headline[0] ?? 'Finished');
  return (
    <li className="flex items-center gap-2.5 rounded-md p-2 text-sm hover:bg-muted/40"
      data-testid="sim-recent">
      <span aria-label={job.status}
        className={cn('size-2 shrink-0 rounded-full', dot)} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{jobName(job)}</div>
        <div className={cn('truncate text-xs', job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}>
          {line}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {relativeTime(job.finishedAt ?? job.createdAt, now)}
      </span>
      {job.reportUrl && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 text-xs"
          onClick={() => void openUrl(job.reportUrl!)}
        >
          Open
          <ExternalLink className="size-3" />
        </Button>
      )}
    </li>
  );
}

/**
 * `sim` panel: read-only status of the user's Horadric Sim jobs (website and overlay). It never starts, stops or
 * edits a sim. Polls every 5 s while one is in flight, else every minute, and right away on any overlay intent.
 */
const SimStatusPage: React.FC = () => {
  const { close } = usePanel<'sim'>();
  const { openPanel } = useOverlay();
  const { settings, isLoading } = useOptions();
  const access = useSimAccess();
  const token = isLoading ? undefined : settings?.pd2Token || null;
  const canUse = !!token && !!access?.canUse;

  const [jobs, setJobs] = useState<SimJobStatus[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  /** Bumped by an intent: refetch right away. */
  const [nudge, setNudge] = useState(0);
  /** The last answer had a queued/running sim: poll fast (stays after a failed poll). */
  const activeRef = useRef(false);

  useEffect(() => (canUse ? subscribeIntents(() => setNudge((n) => n + 1)) : undefined), [canUse]);

  const load = useCallback(async (tok: string, signal: AbortSignal) => {
    try {
      const next = await getMySimJobs(tok, signal);
      if (signal.aborted) return;
      activeRef.current = next.some(isActiveJob);
      setJobs(next);
      setFailed(false);
    } catch {
      if (!signal.aborted) setFailed(true);
    }
    if (!signal.aborted) setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!canUse || !token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await load(token, controller.signal);
      if (controller.signal.aborted) return;
      timer = setTimeout(() => void tick(), activeRef.current ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    };
    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canUse, token, nudge, load]);

  const running = jobs?.filter(isActiveJob) ?? [];
  const recent = jobs?.filter((job) => !isActiveJob(job)) ?? [];

  let body: React.ReactNode;
  if (token === null) {
    body = (
      <div role="status"
        className="flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>Sign in to see your Horadric Sim runs.</p>
        <Button size="sm"
          onClick={() => openPanel('signIn')}>
          <LogIn className="size-3.5" />
          Sign in
        </Button>
      </div>
    );
  } else if (access && !access.canUse) {
    body = <SimWaitlist access={access}
      className="m-3" />;
  } else if (!jobs) {
    body = failed ? (
      <p className="p-6 text-center text-sm text-destructive">Could not load your sims. Retrying…</p>
    ) : (
      <div className="flex justify-center p-6">
        <Loader2 aria-label="Loading"
          className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (jobs.length === 0) {
    body = <p className="p-6 text-center text-sm text-muted-foreground">No sims in the last 24 hours</p>;
  } else {
    body = (
      <div className="space-y-4 p-3">
        {running.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Running</h3>
            <ul className="space-y-2">
              {running.map((job) => (
                <RunningRow key={job.id}
                  job={job} />
              ))}
            </ul>
          </section>
        )}
        {recent.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</h3>
            <ul className="space-y-0.5">
              {recent.map((job) => (
                <RecentRow key={job.id}
                  job={job}
                  now={now} />
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <WindowPanel animate
      className="h-full w-full">
      <WindowChrome title="Horadric Sim · status"
        icon={<FlaskConical />}
        onClose={close} />
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </WindowPanel>
  );
};

export default SimStatusPage;
