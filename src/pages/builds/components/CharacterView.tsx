import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, History, Repeat, SearchX, Skull, Star, Swords, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HoverPopover } from '@/components/custom/hover-popover';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { openUrl } from '@/lib/browser-opener';
import { useOptions } from '@/hooks/useOptions';
import {
  type BuildsMode,
  type CharacterDetail,
  type CharacterSkill,
  type EquippedItem,
  getCharacterSnapshot,
} from '@/lib/builds-api';
import { snapshotQueryKey, useBuildCharacter, useBuildsQuery } from '../lib/useBuildsQuery';
import { isFollowed, pushRecent, toggleFollow } from '../lib/character-refs';
import { characterSiteUrl, classMeta, fmtDateTime, fmtHr, qualityBorder, timeAgo } from '../lib/format';
import {
  ClassEmblem,
  ItemActionsMenu,
  ItemIcon,
  ItemTooltipCard,
  QueryError,
  Section,
  Segmented,
  SkillIcon,
} from './parts';
import { GearUp } from './GearUp';
import { Timeline } from './Timeline';

type DollItem = EquippedItem & { iconUrl: string | null; priceHr?: number | null };

interface DollCellDef {
  area: string;
  slots: string[];
  label: string;
}

// Paper-doll cells in the in-game inventory layout.
const DOLL: DollCellDef[] = [
  { area: 'helm', slots: ['Helm'], label: 'Helm' },
  { area: 'amul', slots: ['Amulet'], label: 'Amulet' },
  { area: 'weap', slots: ['Right Hand', 'Right Hand Switch'], label: 'Weapon' },
  { area: 'armr', slots: ['Armor'], label: 'Armor' },
  { area: 'shld', slots: ['Left Hand', 'Left Hand Switch'], label: 'Off-hand' },
  { area: 'rrng', slots: ['Right Ring'], label: 'Ring' },
  { area: 'belt', slots: ['Belt'], label: 'Belt' },
  { area: 'lrng', slots: ['Left Ring'], label: 'Ring' },
  { area: 'glov', slots: ['Gloves'], label: 'Gloves' },
  { area: 'boot', slots: ['Boots'], label: 'Boots' },
];
const MERC_DOLL: DollCellDef[] = [
  { area: 'helm', slots: ['Helm'], label: 'Helm' },
  { area: 'weap', slots: ['Right Hand'], label: 'Weapon' },
  { area: 'armr', slots: ['Armor'], label: 'Armor' },
  { area: 'shld', slots: ['Left Hand'], label: 'Shield' },
  { area: 'glov', slots: ['Gloves'], label: 'Gloves' },
  { area: 'belt', slots: ['Belt'], label: 'Belt' },
  { area: 'boot', slots: ['Boots'], label: 'Boots' },
];
const DOLL_AREAS = `". helm amul" "weap armr shld" "rrng belt lrng" "glov . boot"`;
const MERC_AREAS = `". helm ." "weap armr shld" "glov belt boot"`;
/** Cell heights per area (px): weapons/armor tall, rings/amulet small. */
const AREA_HEIGHT: Record<string, number> = {
  helm: 60,
  amul: 44,
  weap: 104,
  armr: 104,
  shld: 104,
  rrng: 44,
  lrng: 44,
  belt: 44,
  glov: 60,
  boot: 60,
};

const ATTRS: [keyof CharacterDetail['attributes'], string][] = [
  ['strength', 'Str'],
  ['dexterity', 'Dex'],
  ['vitality', 'Vit'],
  ['energy', 'Ene'],
];

type Pane = 'gear-up' | 'timeline';

/** One character's build: header, paper dolls, skills, Gear up and Timeline. */
export function CharacterView({ name, mode, onBack }: { name: string; mode?: BuildsMode; onBack: () => void }) {
  const { settings, updateSettings } = useOptions();
  const query = useBuildCharacter(name, mode);
  const detail = query.data && !query.stale && query.data.name.toLowerCase() === name.toLowerCase() ? query.data : null;
  const [pane, setPane] = useState<Pane>('gear-up');
  const [snapId, setSnapId] = useState<string | null>(null);
  const [weaponSet, setWeaponSet] = useState(0);
  // Another character: start from now
  const [shownFor, setShownFor] = useState(name);
  if (shownFor !== name) {
    setShownFor(name);
    setSnapId(null);
    setWeaponSet(0);
  }

  const snapshot = useBuildsQuery(
    detail && snapId ? snapshotQueryKey(detail.name, detail.mode, snapId) : null,
    (signal) => getCharacterSnapshot(detail?.name ?? name, snapId ?? '', { mode: detail?.mode }, signal),
  );

  // Remember as recently viewed (settings are written only when the list actually changes)
  const recent = settings?.recentBuildCharacters;
  const detailName = detail?.name;
  const detailMode = detail?.mode;
  useEffect(() => {
    if (!detailName || !detailMode || !recent) return;
    const next = pushRecent(recent, { name: detailName, mode: detailMode });
    if (next !== recent) updateSettings({ recentBuildCharacters: next });
  }, [detailName, detailMode, recent, updateSettings]);

  // Time machine: a snapshot replaces the live build. Snapshot items carry no icon or price: icons come from the
  // live build when it still knows the item; prices are left out (they'd be today's, not then).
  const viewing = snapId && snapshot.data && !snapshot.stale ? snapshot.data : null;
  const shown = useMemo(() => {
    if (!detail) return null;
    if (!viewing) return detail;
    const icons = new Map([...detail.equipped, ...(detail.merc?.equipped ?? [])].map((it) => [it.key, it.iconUrl]));
    const unpriced = (items: EquippedItem[]): DollItem[] =>
      items.map((it) => ({ ...it, iconUrl: icons.get(it.key) ?? null }));
    return {
      ...detail,
      ...viewing.doc,
      equipped: unpriced(viewing.doc.equipped),
      merc: viewing.doc.merc ? { ...viewing.doc.merc, equipped: unpriced(viewing.doc.merc.equipped) } : null,
    };
  }, [detail, viewing]);

  if (query.error) {
    return (
      <div className="flex h-full flex-col">
        <BackBar onBack={onBack} />
        {query.status === 404 ? (
          <EmptyState
            className="m-6"
            icon={<SearchX />}
            title={`No tracked character named ${name}${mode ? ` in ${mode}` : ''}`}
            description="Ladder characters level 80 and up are tracked, refreshed about once a day. A character that just hit 80, or a typo, may not be here yet."
          />
        ) : (
          <QueryError query={query}
            className="m-4"
            title="Couldn't load this character" />
        )}
      </div>
    );
  }
  if (!detail || !shown) return <CharacterSkeleton onBack={onBack} />;

  const ref = { name: detail.name, mode: detail.mode };
  const followed = isFollowed(settings?.followedBuildCharacters ?? [], ref);
  const meta = classMeta(detail.className);
  const hasSwitch = shown.equipped.some((it) => it.slot.endsWith('Switch'));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div
        className="relative flex shrink-0 items-center gap-3 border-b border-border/60 px-3 py-2.5"
        style={{ backgroundImage: `linear-gradient(90deg, ${meta.color}1f, transparent 45%)` }}
      >
        <Button variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label="Back"
          title="Back"
          onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <ClassEmblem className={detail.className}
          size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="truncate text-lg leading-tight font-semibold text-foreground"
              style={{ fontFamily: 'DiabloFont' }}
            >
              {detail.name}
            </h2>
            <Badge variant="outline"
              className="px-1.5 py-0 text-[10px]">
              {detail.mode === 'hardcore' ? 'Hardcore' : 'Softcore'}
            </Badge>
            {shown.isDead && detail.mode === 'hardcore' && (
              <Badge variant="outline"
                className="gap-1 border-destructive/40 px-1.5 py-0 text-[10px] text-destructive">
                <Skull /> Dead
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              <span className="text-foreground tabular-nums">Level {shown.level}</span>{' '}
              <span style={{ color: meta.color }}>{detail.className}</span>
            </span>
            <span className="tabular-nums">
              <span className="text-destructive/90">Life {shown.life.toLocaleString()}</span> ·{' '}
              <span className="text-q-magic">Mana {shown.mana.toLocaleString()}</span>
            </span>
            <span className="tabular-nums">
              {ATTRS.map(([key, label]) => `${label} ${shown.attributes[key]}`).join(' · ')}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] tracking-wide text-muted-foreground uppercase">Gear value</div>
            <div className="text-base font-semibold text-q-gold tabular-nums">
              {shown.gearValueHr != null ? `${fmtHr(shown.gearValueHr)} HR` : '—'}
            </div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <div title={fmtDateTime(detail.lastUpdated)}>Updated {timeAgo(detail.lastUpdated)}</div>
            <div title={fmtDateTime(detail.firstSeenAt)}>First seen {timeAgo(detail.firstSeenAt)}</div>
          </div>
          <Button
            variant={followed ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            aria-pressed={followed}
            onClick={() =>
              updateSettings({ followedBuildCharacters: toggleFollow(settings?.followedBuildCharacters ?? [], ref) })
            }
          >
            <Star className={cn('size-3.5', followed && 'fill-q-gold text-q-gold')} />
            {followed ? 'Following' : 'Follow'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            aria-label="Open on pd2trader.com"
            title="Open on pd2trader.com"
            onClick={() => void openUrl(characterSiteUrl(detail.name))}
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
      </div>

      {viewing && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-primary/30 bg-primary/10 px-3 py-1.5 text-xs"
        >
          <History className="size-3.5 text-primary" />
          <span>
            Viewing <span className="font-medium">{fmtDateTime(viewing.takenAt)}</span>
            <span className="text-muted-foreground"> · prices hidden</span>
          </span>
          <Button variant="outline"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px]"
            onClick={() => setSnapId(null)}>
            Back to now
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Dolls + skills */}
        <div className="flex w-[290px] shrink-0 flex-col divide-y divide-border/50 overflow-y-auto border-r border-border/50">
          <Section
            title="Equipment"
            icon={<Swords />}
            bodyClassName="py-3"
            action={
              hasSwitch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
                  aria-pressed={weaponSet === 1}
                  title="Weapon switch"
                  onClick={() => setWeaponSet(weaponSet ? 0 : 1)}
                >
                  <Repeat className="size-3" /> {weaponSet ? 'II' : 'I'}
                </Button>
              )
            }
          >
            <Doll cells={DOLL}
              areas={DOLL_AREAS}
              items={shown.equipped}
              weaponSet={weaponSet} />
          </Section>
          {shown.merc && (
            <Section
              title={
                <span>
                  Merc <span className="font-normal text-muted-foreground">· {shown.merc.type}</span>
                </span>
              }
              icon={<Users />}
              bodyClassName="py-3"
            >
              <Doll cells={MERC_DOLL}
                areas={MERC_AREAS}
                items={shown.merc.equipped}
                weaponSet={0}
                merc />
            </Section>
          )}
          <SkillsList skills={shown.skills} />
        </div>

        {/* Gear up / Timeline */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center border-b border-border/50 px-3">
            <Segmented
              label="Character view"
              layoutId="builds-character-pane"
              value={pane}
              onChange={setPane}
              options={[
                { value: 'gear-up', label: 'Gear up' },
                { value: 'timeline', label: 'Timeline' },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pane === 'gear-up' ? (
              <GearUp detail={detail} />
            ) : (
              <Timeline name={detail.name}
                mode={detail.mode}
                selectedId={snapId}
                onSelect={setSnapId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-border/60 px-3">
      <Button variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={onBack}>
        <ArrowLeft className="size-4" /> Back
      </Button>
    </div>
  );
}

function CharacterSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div aria-busy
      className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-3 py-2.5">
        <Button variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label="Back"
          onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <Skeleton className="h-11 w-12" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
      <div className="flex flex-1 gap-3 p-3">
        <Skeleton className="h-[420px] w-[300px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function Doll({
  cells,
  areas,
  items,
  weaponSet,
  merc = false,
}: {
  cells: DollCellDef[];
  areas: string;
  items: DollItem[];
  weaponSet: number;
  merc?: boolean;
}) {
  const bySlot = new Map(items.map((it) => [it.slot, it]));
  return (
    <div className="mx-auto grid w-fit grid-cols-[76px_76px_76px] gap-1.5"
      style={{ gridTemplateAreas: areas }}>
      {cells.map((cell) => {
        const slot = cell.slots[cell.slots.length > 1 ? weaponSet : 0];
        return <DollCell key={cell.area}
          cell={cell}
          item={bySlot.get(slot)}
          merc={merc} />;
      })}
    </div>
  );
}

function DollCell({ cell, item, merc }: { cell: DollCellDef; item: DollItem | undefined; merc: boolean }) {
  const height = AREA_HEIGHT[cell.area];
  if (!item) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-border/60 bg-background/20 text-[10px] text-muted-foreground/70"
        style={{ gridArea: cell.area, height }}
      >
        {cell.label}
      </div>
    );
  }
  const iconSize = Math.min(height - 16, 64);
  return (
    <div style={{ gridArea: cell.area }}>
      <HoverPopover side="right"
        content={<ItemTooltipCard item={item} />}>
        <ItemActionsMenu item={item}
          merc={merc}>
          <button
            type="button"
            aria-label={`${item.name} (${item.slot})`}
            className={cn(
              'relative flex w-full flex-col items-center justify-center rounded-md border bg-background/40 outline-none transition-[background-color,transform] duration-(--dur-fast) hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]',
              qualityBorder(item.quality, item.runeword),
            )}
            style={{ height }}
          >
            <ItemIcon item={item}
              size={iconSize}
              className="border-0 bg-transparent" />
            {item.ethereal && (
              <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-muted-foreground"
                title="Ethereal">
                E
              </span>
            )}
            {item.corrupted && (
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-q-corrupted"
                title="Corrupted" />
            )}
            {item.priceHr != null && (
              <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-background/80 px-1 text-[9px] leading-tight font-medium text-q-gold tabular-nums">
                {fmtHr(item.priceHr)}
              </span>
            )}
          </button>
        </ItemActionsMenu>
      </HoverPopover>
    </div>
  );
}

function SkillsList({ skills }: { skills: CharacterSkill[] }) {
  const shown = skills.filter((s) => s.total > 0 || s.base > 0);
  const max = Math.max(1, ...shown.map((s) => s.total));
  return (
    <Section
      title="Skills"
      bodyClassName="px-0 py-1"
      action={<span className="text-[10px] text-muted-foreground">hard / total</span>}
    >
      {shown.length === 0 ? (
        <p className="p-2 text-center text-xs text-muted-foreground">No skills recorded.</p>
      ) : (
        <ul>
          {shown.map((s) => (
            <li key={s.name}
              className="flex items-center gap-2 px-3 py-0.5">
              <SkillIcon name={s.name}
                size={22} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs">{s.name}</span>
                  <span className="text-[11px] tabular-nums">
                    <span className="text-foreground">{s.base}</span>
                    <span className="text-muted-foreground"> / {s.total}</span>
                  </span>
                </div>
                <span className="relative mt-0.5 block h-1 overflow-hidden rounded-full bg-muted/60"
                  aria-hidden>
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
                    style={{ width: `${(s.total / max) * 100}%` }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: `${(s.base / max) * 100}%` }}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
