import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, Loader2, LogIn, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SimCharacterPicker } from '@/components/custom/SimCharacterPicker';
import { SimTryOnHotkeyHint } from '@/components/custom/SimTryOnHotkeyHint';
import { SimWaitlist } from '@/components/custom/SimWaitlist';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { openUrl } from '@/lib/browser-opener';
import { subscribeIntents } from '@/lib/overlay-intents';
import { preferredSimCharacter } from '@/lib/sim-characters';
import { getMySimJobs, isActiveJob, reportSlug, type SimJobStatus } from '@/lib/sim-jobs-api';
import {
  legacySimCharacter,
  rememberLegacySimCharacter,
  SIM_GOALS,
  simGoalLabel,
  type SimGoal,
} from '@/lib/sim-preferences';
import { savedSimCharacter, simPlannerUrl } from '@/lib/sim-try-on';
import { cn } from '@/lib/utils';
import { useOverlay, usePanel } from '@/overlay';
import { OpenLinkButton, SimResultCard } from './components/SimResultCard';

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

/** The newest finished sim: what the card shows until the user picks another. */
function newestResult(results: readonly SimJobStatus[]): SimJobStatus | null {
  let newest: SimJobStatus | null = null;
  let newestAt = -Infinity;
  for (const job of results) {
    const at = Date.parse(job.finishedAt ?? job.createdAt);
    if (at > newestAt) [newest, newestAt] = [job, at];
  }
  return newest;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
  );
}

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
    <li className="space-y-1.5 rounded-md border border-border/60 p-2"
      data-testid="sim-running">
      <div className="truncate text-sm font-medium">{jobName(job)}</div>
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

function ResultRow({
  job,
  now,
  selected,
  onSelect,
}: {
  job: SimJobStatus;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const dot =
    job.status === 'succeeded' ? 'bg-success' : job.status === 'failed' ? 'bg-destructive' : 'bg-muted-foreground';
  const line =
    job.status === 'failed'
      ? (job.error ?? 'Sim failed')
      : job.status === 'cancelled'
        ? 'Cancelled'
        : (job.headline[0] ?? 'Finished');
  return (
    <li>
      <button
        type="button"
        aria-current={selected || undefined}
        data-testid="sim-result"
        onClick={onSelect}
        className={cn(
          'flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40',
          selected && 'bg-accent hover:bg-accent',
        )}
      >
        <span aria-label={job.status}
          className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{simGoalLabel(job.goal)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {[job.character, relativeTime(job.finishedAt ?? job.createdAt, now)].filter(Boolean).join(' · ')}
          </span>
          <span
            className={cn(
              'block truncate text-xs',
              job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {line}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Header: the shared default character and goal (Settings → Account → Horadric Sim), used by every Sim action. */
function SimDefaults({ token }: { token: string }) {
  const { settings, updateSettings } = useOptions();
  const characters = useSimLadderCharacters(token, settings.account ?? '');
  const list = characters.status === 'ok' ? characters.data : [];
  const character = preferredSimCharacter(list, settings.simCharacter || legacySimCharacter());
  return (
    <div className="flex items-center gap-1.5"
      data-no-drag>
      <span className="text-[11px] text-muted-foreground">defaults</span>
      {characters.status === 'loading' ? (
        <Skeleton className="h-7 w-40" />
      ) : (
        character && (
          <SimCharacterPicker
            characters={list}
            value={character}
            onChange={(name) => {
              rememberLegacySimCharacter(name);
              updateSettings({ simCharacter: name });
            }}
            className="h-7 w-44"
          />
        )
      )}
      <Select
        value={settings.simGoal ?? 'quick_sim'}
        onValueChange={(value) => updateSettings({ simGoal: value as SimGoal })}
      >
        <SelectTrigger className="h-7 w-36 text-xs"
          aria-label="Default goal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SIM_GOALS.map((option) => (
            <SelectItem key={option.value}
              value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Right pane: the selected sim's card, why it failed, or nothing to show yet. */
function Detail({ job, token, plannerUrl }: { job: SimJobStatus | null; token: string; plannerUrl: string | null }) {
  if (!job) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No results in the last 24 hours. Sims you run on pd2trader.com show here.
      </div>
    );
  }
  const slug = job.status === 'succeeded' ? reportSlug(job.reportUrl) : null;
  if (slug && job.reportUrl) {
    return <SimResultCard key={slug}
      token={token}
      slug={slug}
      reportUrl={job.reportUrl} />;
  }
  const planner = job.character ? simPlannerUrl(job.character, job.goal) : plannerUrl;
  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <div className="font-medium">{jobName(job)}</div>
      <p className={job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
        {job.status === 'failed'
          ? (job.error ?? 'This sim failed.')
          : job.status === 'cancelled'
            ? 'This sim was cancelled.'
            : 'This sim has no report.'}
      </p>
      {planner && <OpenLinkButton url={planner}>Open in planner</OpenLinkButton>}
    </div>
  );
}

/**
 * `sim` panel: the user's Horadric Sim runs (website and overlay) and a compact result card for the selected
 * finished one. It never starts, stops or edits a sim and never computes a number: every figure comes from the
 * stored report. Polls every 5 s while one is in flight, else every minute, and right away on any overlay intent.
 * Opened with `{ slug, url }` (a report-ready toast) it selects that report's sim, or opens `url` when none listed.
 */
const SimPage: React.FC = () => {
  const { close, payload, payloadVersion } = usePanel<'sim'>();
  const { openPanel } = useOverlay();
  const { settings, isLoading } = useOptions();
  const access = useSimAccess();
  const token = isLoading ? undefined : settings?.pd2Token || null;
  const canUse = !!token && !!access?.canUse;

  const [jobs, setJobs] = useState<SimJobStatus[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Opened on a report: select its sim from a fresh list (it may have just finished), else open the report itself
  useEffect(() => {
    if (!payload || !canUse || !token) return;
    const controller = new AbortController();
    getMySimJobs(token, controller.signal).then(
      (next) => {
        if (controller.signal.aborted) return;
        setJobs(next);
        setNow(Date.now());
        const hit = next.find((job) => !isActiveJob(job) && reportSlug(job.reportUrl) === payload.slug);
        if (hit) setSelectedId(hit.id);
        else void openUrl(payload.url);
      },
      () => {
        if (!controller.signal.aborted) void openUrl(payload.url);
      },
    );
    return () => controller.abort();
  }, [payload, payloadVersion, canUse, token]);

  const running = jobs?.filter(isActiveJob) ?? [];
  const results = jobs?.filter((job) => !isActiveJob(job)) ?? [];
  const selected = results.find((job) => job.id === selectedId) ?? newestResult(results);

  const defaultCharacter = savedSimCharacter(settings);
  const plannerUrl = defaultCharacter ? simPlannerUrl(defaultCharacter, settings.simGoal) : null;

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
  } else if (!jobs || !token) {
    body = failed ? (
      <p className="p-6 text-center text-sm text-destructive">Could not load your sims. Retrying…</p>
    ) : (
      <div className="flex justify-center p-6">
        <Loader2 aria-label="Loading"
          className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  } else {
    body = (
      <div className="flex h-full min-h-0">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/60">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {running.length > 0 && (
              <section>
                <SectionTitle>Running</SectionTitle>
                <ul className="space-y-2">
                  {running.map((job) => (
                    <RunningRow key={job.id}
                      job={job} />
                  ))}
                </ul>
              </section>
            )}
            <section>
              <SectionTitle>Results</SectionTitle>
              {results.length === 0 ? (
                <p className="px-2 text-xs text-muted-foreground">None in the last 24 hours</p>
              ) : (
                <ul className="space-y-0.5">
                  {results.map((job) => (
                    <ResultRow
                      key={job.id}
                      job={job}
                      now={now}
                      selected={job.id === selected?.id}
                      onSelect={() => setSelectedId(job.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
          <div className="space-y-2 border-t border-border/60 p-3">
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full justify-start px-2 text-xs"
                disabled={!plannerUrl}
                title={plannerUrl ? undefined : 'Pick a default character first'}
                onClick={() => plannerUrl && void openUrl(plannerUrl)}
              >
                <FlaskConical className="size-3 shrink-0" />
                <span className="truncate">Open planner</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full justify-start px-2 text-xs"
                onClick={() => openPanel('currency', { tab: 'simulator' })}
              >
                <Send className="size-3 shrink-0" />
                <span className="truncate">Send stash…</span>
              </Button>
            </div>
            <SimTryOnHotkeyHint />
          </div>
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto p-4">
          <Detail job={selected}
            token={token}
            plannerUrl={plannerUrl} />
        </div>
      </div>
    );
  }

  return (
    <WindowPanel animate
      className="h-full w-full">
      <WindowChrome
        title="Horadric Sim"
        icon={<FlaskConical />}
        actions={canUse && token ? <SimDefaults token={token} /> : undefined}
        onClose={close}
      />
      <div className="min-h-0 flex-1">{body}</div>
    </WindowPanel>
  );
};

export default SimPage;
