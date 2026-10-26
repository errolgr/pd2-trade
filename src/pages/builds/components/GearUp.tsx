import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, CircleDashed, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  type CharacterDetail,
  filterParams,
  getBuildShoppingList,
  getBuildUsage,
  type ShoppingListResponse,
  type UsageResponse,
} from '@/lib/builds-api';
import { type BuildsQuery, useBuildsQuery } from '../lib/useBuildsQuery';
import {
  CORE_SHARE,
  isMaxed,
  MIN_PEERS,
  missingCoreTotal,
  peerFilters,
  signatureSkills,
  wornKeys,
} from '../lib/gear-up';
import { classMeta, fmtHr, fmtPct, qualityText } from '../lib/format';
import { ItemIcon, PriceChip, QueryError, SearchMarketButton, Section, ShareBar, SkillIcon } from './parts';

/**
 * How this character's gear compares with characters like it (same class, same skill maxed): the items they
 * wear, worn or missing here, what the missing core costs, the skills they max and their merc.
 */
export function GearUp({ detail }: { detail: CharacterDetail }) {
  const candidates = useMemo(() => signatureSkills(detail.skills), [detail.skills]);
  const [picked, setPicked] = useState<string | null>(null);
  const skill = picked && candidates.some((s) => s.name === picked) ? picked : (candidates[0]?.name ?? null);

  const peers = peerFilters(detail.className, skill, detail.mode);
  const peerKey = JSON.stringify(filterParams(peers));
  const usage = useBuildsQuery(`usage|${peerKey}`, (signal) => getBuildUsage(peers, signal));
  const shopping = useBuildsQuery(`shopping|${peerKey}`, (signal) => getBuildShoppingList(peers, signal));
  // Too few with that skill maxed: compare with the whole class instead
  const fallback = !usage.stale && !!usage.data && usage.data.total < MIN_PEERS && !!skill;
  const classPeers = peerFilters(detail.className, null, detail.mode, true);
  const classKey = JSON.stringify(filterParams(classPeers));
  const classUsage = useBuildsQuery(fallback ? `usage|${classKey}` : null, (signal) =>
    getBuildUsage(classPeers, signal),
  );
  const classShopping = useBuildsQuery(fallback ? `shopping|${classKey}` : null, (signal) =>
    getBuildShoppingList(classPeers, signal),
  );

  const u = fallback ? classUsage : usage;
  const s = fallback ? classShopping : shopping;
  const worn = useMemo(() => wornKeys(detail), [detail]);
  const meta = classMeta(detail.className);
  const plural = /ss$/.test(detail.className) ? `${detail.className}es` : `${detail.className}s`;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">Compare with</span>
        {candidates.length > 0 ? (
          <Select value={skill ?? undefined}
            onValueChange={setPicked}>
            <SelectTrigger aria-label="Build skill"
              className="h-7 w-56 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.name}
                  value={c.name}
                  className="text-xs">
                  <SkillIcon name={c.name}
                    size={16} />
                  {c.name}
                  <span className="text-muted-foreground tabular-nums">{c.base} pts</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <span className="text-xs"
          style={{ color: meta.color }}>
          {plural}
        </span>
        {u.data && !u.stale && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {fallback ? (
              <span>
                {u.data.total.toLocaleString()} {plural} at level 80+
              </span>
            ) : (
              <span>
                <span className="font-medium text-foreground tabular-nums">{u.data.total.toLocaleString()}</span>{' '}
                {skill} {plural} at level 80+
              </span>
            )}
          </span>
        )}
      </div>

      {fallback && usage.data && (
        <p className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-warning" />
          Only {usage.data.total} {plural} max {skill}; comparing with every {detail.className} instead.
        </p>
      )}

      <div className="grid flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] divide-x divide-border/50">
        <TopItems query={s}
          worn={worn} />
        <div className="divide-y divide-border/50">
          <PeerSkills query={u}
            detail={detail} />
          <PeerMerc query={u}
            detail={detail} />
        </div>
      </div>
    </div>
  );
}

function TopItems({ query, worn }: { query: BuildsQuery<ShoppingListResponse>; worn: Set<string> }) {
  const data = query.data;
  const missing = data ? missingCoreTotal(data.items, worn) : 0;
  const missingCount = data ? data.items.filter((i) => i.pct >= CORE_SHARE && !worn.has(i.key)).length : 0;
  return (
    <Section title="What they wear"
      bodyClassName="px-0 py-1">
      {query.error ? (
        <QueryError query={query}
          className="m-2"
          compact />
      ) : !data || query.stale ? (
        <RowsSkeleton rows={8} />
      ) : data.items.length === 0 ? (
        <p className="p-3 text-center text-xs text-muted-foreground">Not enough data yet.</p>
      ) : (
        <>
          <ul>
            {data.items.map((item) => {
              const has = worn.has(item.key);
              return (
                <li key={item.key}
                  className="flex items-center gap-2 px-3 py-1 hover:bg-accent/30">
                  <ItemIcon item={item}
                    size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn('min-w-0 flex-1 truncate text-xs', qualityText(item.quality))}>
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{fmtPct(item.pct)}</span>
                    </div>
                    <ShareBar pct={item.pct}
                      className="mt-1"
                      barClassName={has ? 'bg-success/70' : undefined} />
                  </div>
                  <PriceChip hr={item.priceHr}
                    className="w-14 text-right" />
                  {has ? (
                    <span className="flex w-[72px] items-center gap-1 text-[11px] font-medium text-success">
                      <Check className="size-3.5" /> Worn
                    </span>
                  ) : (
                    <span className="flex w-[72px] items-center gap-1 text-[11px] text-muted-foreground">
                      <CircleDashed className="size-3.5" /> Missing
                    </span>
                  )}
                  <SearchMarketButton item={item} />
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/50 px-3 pt-2 pb-1 text-xs">
            {missingCount > 0 ? (
              <>
                <span
                  className="text-muted-foreground"
                  title={`Items worn by ${CORE_SHARE}% or more that this character doesn't wear`}
                >
                  Missing core items ({missingCount})
                </span>
                <span className="font-semibold text-q-gold tabular-nums">
                  {missing > 0 ? `≈ ${fmtHr(missing)} HR` : 'Unpriced'}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-success">
                <Check className="size-3.5" /> Wears every core item ({CORE_SHARE}%+)
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  );
}

function PeerSkills({ query, detail }: { query: BuildsQuery<UsageResponse>; detail: CharacterDetail }) {
  const data = query.data;
  return (
    <Section title="Skills they max"
      bodyClassName="px-0 py-1">
      {query.error ? (
        <QueryError query={query}
          className="m-2"
          compact />
      ) : !data || query.stale ? (
        <RowsSkeleton rows={5} />
      ) : (
        <ul>
          {data.skills.slice(0, 8).map((s) => {
            const maxed = isMaxed(detail.skills, s.name);
            return (
              <li key={s.name}
                className="flex items-center gap-2 px-3 py-1">
                <SkillIcon name={s.name}
                  size={22} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{fmtPct(s.pct)}</span>
                  </div>
                  <ShareBar pct={s.pct}
                    className="mt-1" />
                </div>
                {maxed ? (
                  <Check className="size-3.5 shrink-0 text-success"
                    aria-label="Maxed here" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0 text-warning"
                    aria-label="Not maxed here">
                    <title>Not maxed on this character</title>
                  </AlertCircle>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function PeerMerc({ query, detail }: { query: BuildsQuery<UsageResponse>; detail: CharacterDetail }) {
  const data = query.data;
  if (query.error || !data || query.stale) return null;
  const top = data.mercTypes[0];
  if (!top) return null;
  const same = detail.merc?.type === top.name;
  return (
    <Section title="Merc"
      bodyClassName="space-y-1 px-3 py-2 text-xs">
      <p>
        Most use <span className="font-medium text-foreground">{top.name}</span>{' '}
        <span className="text-muted-foreground">({fmtPct(top.pct)})</span>
      </p>
      <p className={cn('flex items-center gap-1.5', same ? 'text-success' : 'text-muted-foreground')}>
        {same ? <Check className="size-3.5" /> : <CircleDashed className="size-3.5" />}
        This character: {detail.merc ? detail.merc.type : 'no merc'}
      </p>
    </Section>
  );
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy
      className="space-y-1.5 p-1">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i}
          className="h-7 w-full" />
      ))}
    </div>
  );
}
