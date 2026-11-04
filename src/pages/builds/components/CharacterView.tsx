import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gem, History, Repeat, SearchX, Star, Swords } from 'lucide-react';
import {
  cn,
  Button,
  CharacterCard,
  CurrencyAmount,
  EmptyState,
  type EquipSlot,
  GRID_SIZES,
  type GridItem,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  InventoryGrid,
  MercenaryCard,
  PaperDoll,
  Skeleton,
  toEquipSlot,
} from '@pd2-trader/ui';
import { openUrl } from '@/lib/browser-opener';
import { useOptions } from '@/hooks/useOptions';
import {
  type BuildsMode,
  type CharacterDetail,
  type CharacterSkill,
  type CharmItem,
  type EquippedItem,
  getCharacterSnapshot,
} from '@/lib/builds-api';
import { snapshotQueryKey, useBuildCharacter, useBuildsQuery } from '../lib/useBuildsQuery';
import { isFollowed, pushRecent, toggleFollow } from '../lib/character-refs';
import { characterSiteUrl, classMeta, classPortraitUrl, fmtDateTime, fmtHr, timeAgo } from '../lib/format';
import { itemArtCandidates } from '../lib/item-art';
import { ItemActionsMenu, QueryError, Section, Segmented, SkillIcon, WornItemTooltip } from './parts';
import { GearUp } from './GearUp';
import { currentLocale, Trans, useTranslation } from '@/i18n';
import { Timeline } from './Timeline';

type DollItem = EquippedItem & { iconUrl: string | null; priceHr?: number | null };

const ATTRS: [keyof CharacterDetail['attributes'], string][] = [
  ['strength', 'Str'],
  ['dexterity', 'Dex'],
  ['vitality', 'Vit'],
  ['energy', 'Ene'],
];

type Pane = 'gear-up' | 'timeline';

/** One character's build: header, paper dolls, skills, Gear up and Timeline. */
export function CharacterView({ name, mode, onBack }: { name: string; mode?: BuildsMode; onBack: () => void }) {
  const { t } = useTranslation('builds');
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
      // Snapshots don't record charms
      charms: [],
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
            title={mode ? t('character.notFoundInMode', { name, mode }) : t('character.notFound', { name })}
            description={t('character.notFoundDescription')}
          />
        ) : (
          <QueryError query={query}
            className="m-4"
            title={t('character.loadError')} />
        )}
      </div>
    );
  }
  if (!detail || !shown) return <CharacterSkeleton onBack={onBack} />;

  const ref = { name: detail.name, mode: detail.mode };
  const followed = isFollowed(settings?.followedBuildCharacters ?? [], ref);
  const classColor = classMeta(detail.className).color;
  const hasSwitch = shown.equipped.some((it) => it.slot.endsWith('Switch'));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div
        className="relative flex shrink-0 items-center gap-3 border-b border-border/60 px-3 py-2.5"
        style={{
          backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${classColor} 12%, transparent), transparent 45%)`,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label={t('common:actions.back')}
          title={t('common:actions.back')}
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </Button>
        {/* CharacterCard draws the name as text; the page keeps its heading */}
        <h2 className="sr-only">{detail.name}</h2>
        <CharacterCard
          variant="full"
          name={detail.name}
          cls={detail.className}
          level={shown.level}
          hardcore={detail.mode === 'hardcore'}
          dead={shown.isDead && detail.mode === 'hardcore'}
          portraitSrc={classPortraitUrl(detail.className)}
          className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none"
          stats={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span>
                <span className="text-destructive/90">Life {shown.life.toLocaleString(currentLocale())}</span> ·{' '}
                <span className="text-q-magic">Mana {shown.mana.toLocaleString(currentLocale())}</span>
              </span>
              <span>{ATTRS.map(([key, label]) => `${label} ${shown.attributes[key]}`).join(' · ')}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-3">
              <CurrencyAmount
                amount={shown.gearValueHr ?? Number.NaN}
                unit="hr"
                label={t('character.gearValue')}
                className="items-end"
              />
              <div className="text-right text-2xs text-muted-foreground">
                <div title={fmtDateTime(detail.lastUpdated)}>
                  {t('character.updated', { time: timeAgo(detail.lastUpdated) })}
                </div>
                <div title={fmtDateTime(detail.firstSeenAt)}>
                  {t('character.firstSeen', { time: timeAgo(detail.firstSeenAt) })}
                </div>
              </div>
              <Button
                variant={followed ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                aria-pressed={followed}
                onClick={() =>
                  updateSettings({
                    followedBuildCharacters: toggleFollow(settings?.followedBuildCharacters ?? [], ref),
                  })
                }
              >
                <Star className={cn('size-3.5', followed && 'fill-q-gold text-q-gold')} />
                {followed ? t('characters.following') : t('character.follow')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                aria-label={t('character.openSite')}
                title={t('character.openSite')}
                onClick={() => void openUrl(characterSiteUrl(detail.name))}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          }
        />
      </div>

      {viewing && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-primary/30 bg-primary/10 px-3 py-1.5 text-xs"
        >
          <History className="size-3.5 text-primary" />
          <span>
            <Trans
              t={t}
              i18nKey="character.viewingSnapshot"
              values={{ date: fmtDateTime(viewing.takenAt) }}
              components={{ date: <span className="font-medium" />, muted: <span className="text-muted-foreground" /> }}
            />
          </span>
          <Button variant="outline"
            size="sm"
            className="ml-auto h-6 px-2 text-2xs"
            onClick={() => setSnapId(null)}>
            {t('character.backToNow')}
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Dolls + skills */}
        <div className="flex w-72.5 shrink-0 flex-col divide-y divide-border/50 overflow-y-auto border-r border-border/50">
          <Section
            title={t('character.equipment')}
            icon={<Swords />}
            bodyClassName="py-3"
            action={
              hasSwitch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-2xs text-muted-foreground"
                  aria-pressed={weaponSet === 1}
                  title={t('character.weaponSwitch')}
                  onClick={() => setWeaponSet(weaponSet ? 0 : 1)}
                >
                  <Repeat className="size-3" /> {weaponSet ? 'II' : 'I'}
                </Button>
              )
            }
          >
            <PaperDoll {...dollProps(shown.equipped, weaponSet)} />
          </Section>
          {shown.charms && shown.charms.length > 0 && (
            <Section title={t('character.charms')}
              icon={<Gem />}
              bodyClassName="py-3">
              <CharmGrid charms={shown.charms} />
            </Section>
          )}
          {shown.merc && (
            <div className="p-3">
              <MercenaryCard type={shown.merc.type}
                {...dollProps(shown.merc.equipped, 0, true)} />
            </div>
          )}
          <SkillsList skills={shown.skills} />
        </div>

        {/* Gear up / Timeline */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center border-b border-border/50 px-3">
            <Segmented
              label={t('character.paneLabel')}
              layoutId="builds-character-pane"
              value={pane}
              onChange={setPane}
              options={[
                { value: 'gear-up', label: t('character.gearUp') },
                { value: 'timeline', label: t('character.timeline') },
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
  const { t } = useTranslation('builds');
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-border/60 px-3">
      <Button variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={onBack}>
        <ArrowLeft className="size-4" /> {t('common:actions.back')}
      </Button>
    </div>
  );
}

function CharacterSkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('builds');
  return (
    <div aria-busy
      className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-3 py-2.5">
        <Button variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label={t('common:actions.back')}
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
        <Skeleton className="h-105 w-75" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps a worn slot in the item's actions menu and its tooltip; empty slots stay as they are. `onClick` makes a
 * doll's EquipmentSlot a button (the menu opens on pointer/key down).
 */
function wornSlot(item: DollItem | CharmItem | undefined, node: React.ReactElement, merc = false): React.ReactNode {
  if (!item) return node;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <ItemActionsMenu item={item}
          merc={merc}>
          {node}
        </ItemActionsMenu>
      </HoverCardTrigger>
      <HoverCardContent variant="bare"
        side="right">
        <WornItemTooltip item={item} />
      </HoverCardContent>
    </HoverCard>
  );
}

const noop = () => {};

/** PaperDoll props for the player and merc dolls: art, price badge, menu + tooltip per worn slot. */
function dollProps(items: DollItem[], weaponSet: number, merc = false) {
  const worn: Partial<Record<EquipSlot, DollItem>> = {};
  for (const item of items) {
    const at = toEquipSlot(item.slot);
    // Weapon and off-hand follow the shown weapon set; the rest is worn in both
    if (at && ((at.slot !== 'weapon' && at.slot !== 'offhand') || at.weaponSet === weaponSet)) worn[at.slot] = item;
  }
  const art: Partial<Record<EquipSlot, DollItem & { src: string[] }>> = {};
  for (const [slot, it] of Object.entries(worn) as [EquipSlot, DollItem][])
    art[slot] = { ...it, src: itemArtCandidates(it) };
  return {
    items: art,
    badgeFor: (slot: EquipSlot) => {
      const price = worn[slot]?.priceHr;
      return price != null ? <span className="text-q-gold">{fmtHr(price)}</span> : null;
    },
    wrapSlot: (slot: EquipSlot, node: React.ReactElement) =>
      wornSlot(
        worn[slot],
        worn[slot] ? React.cloneElement(node as React.ReactElement<{ onClick?: () => void }>, { onClick: noop }) : node,
        merc,
      ),
  };
}

function CharmGrid({ charms }: { charms: CharmItem[] }) {
  const byId = new Map(charms.map((c) => [`${c.row}:${c.column}`, c]));
  const items: GridItem[] = charms.map((c) => ({
    id: `${c.row}:${c.column}`,
    name: c.name,
    quality: c.quality ?? 'Rune',
    runeword: c.runeword,
    src: itemArtCandidates(c),
    x: c.column,
    y: c.row,
    w: 1,
    h: c.height,
    corrupted: c.corrupted,
  }));
  return (
    <InventoryGrid
      {...GRID_SIZES.inventory}
      className="mx-auto"
      items={items}
      onSelect={noop}
      wrapItem={(item, node) => wornSlot(byId.get(item.id ?? ''), node)}
    />
  );
}

function SkillsList({ skills }: { skills: CharacterSkill[] }) {
  const shown = skills.filter((s) => s.total > 0 || s.base > 0);
  const { t } = useTranslation('builds');
  const max = Math.max(1, ...shown.map((s) => s.total));
  return (
    <Section
      title={t('character.skills')}
      bodyClassName="px-0 py-1"
      action={<span className="text-2xs text-muted-foreground">{t('character.hardTotal')}</span>}
    >
      {shown.length === 0 ? (
        <p className="p-2 text-center text-xs text-muted-foreground">{t('character.noSkills')}</p>
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
                  <span className="text-2xs tabular-nums">
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
