import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { openUrl } from '@/lib/browser-opener';
import {
  CARD_UNSUPPORTED,
  getSimReportCard,
  type SimCardBody,
  type SimItemRef,
  type SimReportCard,
} from '@/lib/sim-jobs-api';
import { simGoalLabel } from '@/lib/sim-preferences';
import { cn } from '@/lib/utils';
import { SimMarketActions, useSimPriceHints } from './SimMarketActions';

/** Cards never change once a report is written: each is fetched once per app session. */
const cards = new Map<string, SimReportCard>();

/** Tests: forget the fetched cards. */
export function clearSimCardCache(): void {
  cards.clear();
}

type CardLoad =
  | { slug: string; status: 'loading' | 'unsupported' | 'error' }
  | { slug: string; status: 'ok'; card: SimReportCard };

export const formatDps = (dps: number) => Math.round(dps).toLocaleString('en-US');

/** '+12.4%', '−3.0%', '0.0%'. */
export function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toFixed(1)}%`;
}

export const formatCi = (ci: number) => `±${(Math.round(ci * 10) / 10).toFixed(1)}%`;

/** '42.5s', '2m 05s'. */
export function formatKillTime(seconds: number): string {
  if (seconds < 60) return `${(Math.round(seconds * 10) / 10).toFixed(1)}s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, '0')}s`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  );
}

function Big({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-3xl font-semibold leading-tight tabular-nums', className)}>{children}</div>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground tabular-nums">{children}</div>;
}

/** An item row's Market / Watch (marketable items), or a 'stash' tag for an item the user already has. */
function ItemActions({
  item,
  stash,
  hints,
}: {
  item: SimItemRef;
  stash?: boolean;
  hints: ReadonlyMap<string, string>;
}) {
  if (stash) {
    return (
      <span className="shrink-0 rounded border border-border px-1.5 text-[10px] text-muted-foreground">stash</span>
    );
  }
  return <SimMarketActions item={item}
    priceHint={hints.get(item.name)} />;
}

/** Items a card may show market actions for (price hints are fetched for these). */
function marketItems(body: SimCardBody): SimItemRef[] {
  if (body.goal === 'top_gear') return body.changes.filter((c) => c.source !== 'stash').map((c) => c.to);
  if (body.goal === 'upgrade_finder') return body.upgrades.map((u) => u.item);
  return [];
}

function CardBody({ card }: { card: SimReportCard }) {
  const body = card.card;
  const items = useMemo(() => marketItems(body), [body]);
  const hints = useSimPriceHints(items);

  switch (body.goal) {
    case 'top_gear':
      return (
        <div>
          <Big className="text-success">{formatPct(body.gainPct)}</Big>
          <Muted>{`${formatDps(body.baseDps)} → ${formatDps(body.bestDps)} DPS`}</Muted>
          <Muted>
            {[`best of ${body.setsSimmed} sets`, body.ciPct !== null && formatCi(body.ciPct)]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
          <SectionTitle>Changes</SectionTitle>
          {body.changes.length === 0 ? (
            <Muted>Your current gear is already the best set</Muted>
          ) : (
            <ul className="space-y-1">
              {body.changes.map((change) => (
                <li key={change.slot}
                  data-testid="sim-change"
                  className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">{change.slot}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {change.from && (
                      <>
                        <s className="text-muted-foreground">{change.from.name}</s>
                        {' → '}
                      </>
                    )}
                    {change.to.name}
                  </span>
                  <ItemActions item={change.to}
                    stash={change.source === 'stash'}
                    hints={hints} />
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'upgrade_finder':
      return (
        <div>
          <Muted>{`Base ${formatDps(body.baseDps)} DPS`}</Muted>
          <SectionTitle>Top upgrades</SectionTitle>
          {body.upgrades.length === 0 ? (
            <Muted>No upgrade gained DPS</Muted>
          ) : (
            <ul className="space-y-1">
              {body.upgrades.map((upgrade) => (
                <li
                  key={`${upgrade.slot}/${upgrade.item.name}`}
                  data-testid="sim-upgrade"
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {upgrade.item.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">{upgrade.slot}</span>
                  </span>
                  <span className="shrink-0 font-medium text-success tabular-nums">{formatPct(upgrade.gainPct)}</span>
                  <ItemActions item={upgrade.item}
                    hints={hints} />
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'quick_sim':
      return (
        <div>
          <Big>{`${formatDps(body.dps)} DPS`}</Big>
          <Muted>{[body.ciPct !== null && formatCi(body.ciPct), card.scenario].filter(Boolean).join(' · ')}</Muted>
          {body.sources.length > 0 && (
            <>
              <SectionTitle>Damage sources</SectionTitle>
              <ul className="space-y-1.5">
                {body.sources.map((source) => {
                  const pct = Math.round(Math.min(1, Math.max(0, source.share)) * 100);
                  return (
                    <li key={source.label}
                      data-testid="sim-source"
                      className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="truncate">{source.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{`${pct}%`}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {(body.killTimeSec !== null || body.vsPreviousPct !== null) && (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              {body.killTimeSec !== null && (
                <>
                  <dt className="text-muted-foreground">Kill time</dt>
                  <dd className="tabular-nums">{formatKillTime(body.killTimeSec)}</dd>
                </>
              )}
              {body.vsPreviousPct !== null && (
                <>
                  <dt className="text-muted-foreground">vs previous</dt>
                  <dd
                    className={cn(
                      'tabular-nums',
                      body.vsPreviousPct > 0 ? 'text-success' : body.vsPreviousPct < 0 && 'text-destructive',
                    )}
                  >
                    {formatPct(body.vsPreviousPct)}
                  </dd>
                </>
              )}
            </dl>
          )}
        </div>
      );
    case 'stat_weights': {
      const max = Math.max(0, ...body.weights.map((w) => w.pct));
      return (
        <div>
          <SectionTitle>DPS per step</SectionTitle>
          {body.weights.length === 0 ? (
            <Muted>No stat changed DPS</Muted>
          ) : (
            <ul className="space-y-1.5">
              {body.weights.map((weight) => (
                <li key={weight.label}
                  data-testid="sim-weight"
                  className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{weight.label}</span>
                    <span className="shrink-0 text-xs tabular-nums">{formatPct(weight.pct)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${max > 0 ? Math.max(0, (weight.pct / max) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {body.nextBreakpoint && (
            <>
              <SectionTitle>Next breakpoint</SectionTitle>
              <div className="text-sm"
                data-testid="sim-breakpoint">
                {`${[body.nextBreakpoint.stat, body.nextBreakpoint.target].filter((part) => part !== null).join(' ')}: ${body.nextBreakpoint.needed} more`}
                <span className="ml-1.5 font-medium text-success tabular-nums">
                  {formatPct(body.nextBreakpoint.gainPct)}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }
    case 'skill_charm_optimizer':
      return (
        <div>
          <Big className="text-success">{formatPct(body.gainPct)}</Big>
          <SectionTitle>Skill moves</SectionTitle>
          {body.skillMoves.length === 0 ? (
            <Muted>Keep your skill points as they are</Muted>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {body.skillMoves.map((move) => (
                <li key={`${move.from}/${move.to}`}
                  data-testid="sim-skill-move">
                  <span className="tabular-nums text-muted-foreground">{`${move.points} pts `}</span>
                  {`${move.from} → ${move.to}`}
                </li>
              ))}
            </ul>
          )}
          <SectionTitle>Charm swaps</SectionTitle>
          {body.charmSwaps.length === 0 ? (
            <Muted>Keep your charms</Muted>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {body.charmSwaps.map((swap) => (
                <li key={`${swap.from}/${swap.to}`}
                  data-testid="sim-charm-swap">
                  {swap.from && swap.to
                    ? `${swap.from} → ${swap.to}`
                    : swap.to
                      ? `Add ${swap.to}`
                      : `Drop ${swap.from}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
  }
}

export function OpenLinkButton({
  url,
  children,
  primary,
}: {
  url: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={primary ? 'default' : 'outline'}
      className="h-7 text-xs"
      onClick={() => void openUrl(url)}
    >
      {children}
      <ExternalLink className="size-3" />
    </Button>
  );
}

function CardSkeleton() {
  return (
    <div aria-label="Loading result"
      role="status"
      className="space-y-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/**
 * A finished sim's result card: its report's headline numbers (`GET /api/sim/reports/:slug/card`), read as stored,
 * with Open full report for everything else (charts, timelines, breakdowns).
 */
export function SimResultCard({ token, slug, reportUrl }: { token: string; slug: string; reportUrl: string }) {
  const [load, setLoad] = useState<CardLoad>({ slug, status: 'loading' });
  const current = load.slug === slug ? load : null;
  const cached = cards.get(slug) ?? (current?.status === 'ok' ? current.card : undefined);

  useEffect(() => {
    if (cards.has(slug)) return;
    const controller = new AbortController();
    getSimReportCard(token, slug, controller.signal).then(
      (card) => {
        cards.set(slug, card);
        if (!controller.signal.aborted) setLoad({ slug, status: 'ok', card });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({
          slug,
          status: error instanceof Error && error.message === CARD_UNSUPPORTED ? 'unsupported' : 'error',
        });
      },
    );
    return () => controller.abort();
  }, [token, slug]);

  if (cached) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2">
          <div className="text-sm font-medium">
            {cached.character ? `${simGoalLabel(cached.goal)} · ${cached.character}` : simGoalLabel(cached.goal)}
          </div>
          {cached.card.goal !== 'quick_sim' && cached.scenario && <Muted>{cached.scenario}</Muted>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CardBody card={cached} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <OpenLinkButton url={cached.reportUrl}
            primary>
            Open full report
          </OpenLinkButton>
          {cached.plannerUrl && <OpenLinkButton url={cached.plannerUrl}>Open in planner</OpenLinkButton>}
        </div>
      </div>
    );
  }

  const status = current?.status ?? 'loading';
  if (status === 'loading' || status === 'ok') return <CardSkeleton />;
  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <p className="text-muted-foreground">
        {status === 'unsupported' ? 'This report has no summary card here.' : 'Could not load this result.'}
      </p>
      <OpenLinkButton url={reportUrl}
        primary>
        Open full report
      </OpenLinkButton>
    </div>
  );
}
