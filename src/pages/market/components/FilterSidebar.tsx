import React, { useMemo } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { CLASSES, ITEM_TYPES, RARITIES, basesForType, optionCodes } from '../lib/catalog';
import { activeFilters, type FilterSectionId } from '../lib/active-filters';
import { defaultAgeDays, MAX_FILTER_TEXT, MAX_SELLER_NAME, type SearchDefaults, withSource } from '../lib/defaults';
import { countsByValue, type MarketFacets } from '../lib/facets';
import type { MarketFilters, OnlineFilter, Rarity, SortBy } from '../lib/types';
import { FilterSummary } from './ActiveFilters';
import {
  ClearButton,
  Field,
  FilterChip,
  RangeField,
  Section,
  Segmented,
  SelectField,
  TriField,
  fieldInputClass,
} from './controls';
import { FacetCount, PriceHistogram, SocketChips } from './FacetCounts';
import { StatFilters, type StatFiltersProps } from './StatFilters';
import { statName } from './stat-text';
import { useTranslation } from '@/i18n';

const AGE_DAYS = [1, 3, 7, 14, 30, 90];

const rarityColor = (r: Rarity) => (r === 'Runeword' ? 'text-q-rune' : qualityColor(r));

/**
 * Rarity: a multi-select dropdown (quality-coloured items with checkmarks), sized like the other selects. `counts`
 * (facets): listings each rarity alone finds.
 */
function RarityField({
  value,
  onChange,
  counts,
}: {
  value: Rarity[];
  onChange: (v: Rarity[]) => void;
  counts: Map<Rarity, number>;
}) {
  const { t } = useTranslation('market');
  const summary =
    value.length === 0 ? (
      <span className="text-muted-foreground">{t('filters.any')}</span>
    ) : value.length <= 2 ? (
      RARITIES.filter((r) => value.includes(r)).map((r, i) => (
        <React.Fragment key={r}>
          {i > 0 && <span className="text-muted-foreground">, </span>}
          <span className={rarityColor(r)}>{r}</span>
        </React.Fragment>
      ))
    ) : (
      t('filters.selected', { count: value.length })
    );
  return (
    <Field label={t('filters.rarity')}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('filters.rarity')}
          className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 text-xs whitespace-nowrap outline-none transition-[border-color,box-shadow] duration-(--dur-fast) ease-out hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-ring [&[data-state=open]>svg]:rotate-180"
        >
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50 transition-transform duration-(--dur-fast) ease-out" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-40">
          {RARITIES.map((r) => (
            <DropdownMenuCheckboxItem
              key={r}
              checked={value.includes(r)}
              // Stay open: several rarities are usually picked in a row
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) => onChange(on ? [...value, r] : value.filter((x) => x !== r))}
              className={cn('text-xs', rarityColor(r))}
            >
              {r}
              <FacetCount count={counts.get(r)}
                className="ml-auto pl-2" />
            </DropdownMenuCheckboxItem>
          ))}
          {value.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-muted-foreground"
                onSelect={() => onChange([])}>
                {t('filters.anyRarity')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  );
}

type Realm = 'sc-l' | 'sc-nl' | 'hc-l' | 'hc-nl';
const REALMS: Realm[] = ['sc-l', 'sc-nl', 'hc-l', 'hc-nl'];

/**
 * Softcore/hardcore × ladder/non-ladder in one compact picker beside the source: it scopes every result (and the
 * prices), so it stays in sight instead of inside a collapsed section. The trigger uses the cards' SC/HC · L/NL.
 */
function RealmField({
  hardcore,
  ladder,
  onChange,
}: {
  hardcore: boolean;
  ladder: boolean;
  onChange: (realm: { hardcore: boolean; ladder: boolean }) => void;
}) {
  const { t } = useTranslation('market');
  const value: Realm = `${hardcore ? 'hc' : 'sc'}-${ladder ? 'l' : 'nl'}`;
  const name = (realm: Realm) =>
    t('filters.realm.option', {
      mode: t(realm.startsWith('hc') ? 'filters.realm.hardcore' : 'filters.realm.softcore'),
      ladder: t(realm.endsWith('-l') ? 'filters.realm.ladder' : 'filters.realm.nonLadder'),
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t('filters.realm.label')}: ${name(value)}`}
        title={name(value)}
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-input bg-transparent pl-2 pr-1 text-[11px] font-medium whitespace-nowrap outline-none transition-[border-color,box-shadow] duration-(--dur-fast) ease-out hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-ring [&[data-state=open]>svg]:rotate-180"
      >
        {hardcore ? 'HC' : 'SC'}
        <span className="text-muted-foreground">·</span>
        {ladder ? 'L' : 'NL'}
        <ChevronDown className="size-3.5 shrink-0 opacity-50 transition-transform duration-(--dur-fast) ease-out" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="min-w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange({ hardcore: v.startsWith('hc'), ladder: v.endsWith('-l') })}
        >
          {REALMS.map((realm) => (
            <DropdownMenuRadioItem key={realm}
              value={realm}
              className="text-xs">
              {name(realm)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const countDefined = (...values: unknown[]) =>
  values.filter((v) => v !== undefined && v !== '' && v !== 'any' && v !== 'all').length;

export interface FilterSidebarProps {
  filters: MarketFilters;
  onChange: (next: MarketFilters) => void;
  /** Back to the defaults (keeps mode/source). */
  onReset: () => void;
  /** The user's fresh-search defaults: section badges count filters that differ from them. */
  searchDefaults: SearchDefaults;
  stats: Omit<StatFiltersProps, 'stats' | 'onChange'>;
  /** Sections the user opened or closed (by title); the rest use their default. */
  sectionsOpen: Record<string, boolean>;
  onSectionOpen: (title: string, open: boolean) => void;
  /** Facet counts of the current search (shown beside the options); null hides them. */
  facets?: MarketFacets | null;
}

/** An option's count from a code facet: the sum over the codes it stands for; undefined when none is counted. */
function optionCount(code: string, counts: Map<string, number>): number | undefined {
  const known = optionCodes(code).flatMap((c) => (counts.has(c) ? [counts.get(c)!] : []));
  return known.length ? known.reduce((a, b) => a + b, 0) : undefined;
}

/** Stats and Item start open; the rest start collapsed (listing their applied filters under the header). */
const OPEN_BY_DEFAULT = new Set(['Stats', 'Item']);

/** Every site filter, dense and collapsible, plus the stats section. */
export function FilterSidebar({
  filters: f,
  onChange,
  onReset,
  searchDefaults: defaults,
  stats,
  sectionsOpen,
  onSectionOpen,
  facets,
}: FilterSidebarProps) {
  const { t } = useTranslation('market');
  const set = (changes: Partial<MarketFilters>) => onChange({ ...f, ...changes });
  const active = useMemo(() => activeFilters(f, defaults), [f, defaults]);
  /**
   * `id`: the stored open/closed key (the English title); `title`: what the header shows. Collapsed, a section lists
   * its applied filters under the header (the item name has its own ✕ in the top bar).
   */
  const section = (id: FilterSectionId, title: string) => {
    const applied = active.filter((a) => a.section === id && a.spec.kind !== 'itemName');
    return {
      title,
      open: sectionsOpen[id] ?? OPEN_BY_DEFAULT.has(id),
      onOpenChange: (open: boolean) => onSectionOpen(id, open),
      summary: applied.length > 0 && (
        <FilterSummary filters={f}
          active={applied}
          onChange={onChange}
          onOpen={() => onSectionOpen(id, true)} />
      ),
    };
  };
  const ageLabel = (days: number) => t('filters.days', { count: days });
  const ageOptions = AGE_DAYS.map((d) => ({ value: String(d), label: ageLabel(d) }));
  const sortOptions: { value: SortBy; label: string; title: string }[] = [
    { value: 'bumped', label: t('filters.sort.bumped'), title: t('filters.sort.bumpedTitle') },
    { value: 'price', label: t('filters.sort.price'), title: t('filters.sort.priceTitle') },
  ];
  const onlineOptions: { value: OnlineFilter; label: string }[] = [
    { value: 'all', label: t('filters.any') },
    { value: 'online', label: t('filters.online') },
    { value: 'offline', label: t('filters.offline') },
  ];
  const setReq = (changes: Partial<MarketFilters['requirements']>) =>
    set({ requirements: { ...f.requirements, ...changes } });
  const bases = useMemo(() => (f.typeCode ? basesForType(f.typeCode) : []), [f.typeCode]);
  const req = f.requirements;
  const counts = useMemo(
    () => ({
      quality: countsByValue(facets?.quality),
      typeCode: countsByValue(facets?.typeCode),
      baseCode: countsByValue(facets?.baseCode),
      sockets: countsByValue(facets?.sockets),
      ethereal: countsByValue(facets?.ethereal),
      corrupted: countsByValue(facets?.corrupted),
    }),
    [facets],
  );
  const yesNo = (m: Map<boolean, number>) => ({ yes: m.get(true), no: m.get(false) });

  return (
    <aside aria-label={t('filters.label')}
      className="flex h-full min-h-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <Segmented
          label={t('filters.source.label')}
          value={f.source}
          onChange={(source) => onChange(withSource(f, source, defaults))}
          options={[
            { value: 'live', label: t('filters.source.live') },
            { value: 'archive', label: t('filters.source.archive'), title: t('filters.source.archiveTitle') },
          ]}
        />
        <RealmField hardcore={f.hardcore}
          ladder={f.ladder}
          onChange={set} />
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0 text-muted-foreground"
          onClick={onReset}
          aria-label={t('filters.clearAll')}
          title={t('filters.clearAll')}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <Section
          {...section('Stats', t('filters.sections.stats'))}
          active={f.stats.filter((s) => s.enabled).length}
          actions={
            f.stats.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                onClick={() => set({ stats: [] })}
                title={t('filters.clearStats')}
              >
                {t('common:actions.clear')}
              </Button>
            )
          }
        >
          <StatFilters {...stats}
            stats={f.stats}
            onChange={(next) => set({ stats: next })} />
        </Section>

        <Section
          {...section('Item', t('filters.sections.item'))}
          active={countDefined(f.typeCode, f.baseCode, req.class) + (f.rarity.length ? 1 : 0)}
        >
          <SelectField
            label={t('filters.type')}
            value={f.typeCode}
            options={ITEM_TYPES.map((o) => ({
              value: o.code,
              label: o.label,
              count: optionCount(o.code, counts.typeCode),
            }))}
            onChange={(typeCode) => set({ typeCode, baseCode: undefined })}
          />
          <SelectField
            label={t('filters.base')}
            value={f.baseCode}
            disabled={!f.typeCode}
            anyLabel={f.typeCode ? t('filters.any') : t('filters.pickTypeFirst')}
            options={bases.map((b) => ({ value: b.code, label: b.label, count: optionCount(b.code, counts.baseCode) }))}
            onChange={(baseCode) => set({ baseCode })}
          />
          <RarityField value={f.rarity}
            counts={counts.quality}
            onChange={(rarity) => set({ rarity })} />
          <SelectField
            label={t('filters.class')}
            value={req.class}
            options={CLASSES.map((c) => ({ value: c.value, label: c.label }))}
            onChange={(v) => setReq({ class: CLASSES.find((c) => c.value === v)?.value })}
          />
        </Section>

        <Section
          {...section('Properties', t('filters.sections.properties'))}
          active={countDefined(f.ethereal, f.corrupted, f.desecrated, f.identified, f.socketsMin, f.socketsMax)}
        >
          <TriField
            label={t('filters.corrupted')}
            value={f.corrupted}
            counts={yesNo(counts.corrupted)}
            onChange={(corrupted) => set({ corrupted })}
          />
          <RangeField
            label={t('filters.sockets')}
            min={f.socketsMin}
            max={f.socketsMax}
            onChange={(socketsMin, socketsMax) => set({ socketsMin, socketsMax })}
          />
          {counts.sockets.size > 0 && (
            <Field label="">
              <SocketChips
                counts={counts.sockets}
                min={f.socketsMin}
                max={f.socketsMax}
                onPick={(socketsMin, socketsMax) => set({ socketsMin, socketsMax })}
              />
            </Field>
          )}
          <TriField
            label={t('filters.ethereal')}
            value={f.ethereal}
            counts={yesNo(counts.ethereal)}
            onChange={(ethereal) => set({ ethereal })}
          />
          <TriField
            label={t('filters.desecrated')}
            value={f.desecrated}
            onChange={(desecrated) => set({ desecrated })}
          />
          <TriField
            label={t('filters.identified')}
            value={f.identified}
            onChange={(identified) => set({ identified })}
          />
        </Section>

        <Section
          {...section('Listing', t('filters.sections.listing'))}
          // Collapsed by default: a window or sort other than the user's default (e.g. "sort by this" from a mod
          // menu) shows in the badge
          active={
            (f.maxAgeDays !== defaultAgeDays(f.source, defaults) ? 1 : 0) +
            (f.sort.by !== defaults.sort.by || f.sort.dir !== defaults.sort.dir ? 1 : 0)
          }
        >
          <SelectField
            label={t('filters.listedWithin')}
            value={String(f.maxAgeDays)}
            options={
              ageOptions.some((o) => o.value === String(f.maxAgeDays))
                ? ageOptions
                : [...ageOptions, { value: String(f.maxAgeDays), label: ageLabel(f.maxAgeDays) }]
            }
            anyLabel={null}
            onChange={(v) => v && set({ maxAgeDays: Number(v) })}
          />
          <Field label={t('filters.sort.label')}>
            <Segmented
              label={t('filters.sort.label')}
              value={f.sort.by}
              options={sortOptions}
              onChange={(by) => set({ sort: { by, dir: f.sort.dir } })}
            />
          </Field>
          {f.sort.by === 'stat' && f.sort.key && (
            <Field label="">
              <FilterChip removeLabel={t('filters.sort.stopStat')}
                onRemove={() => set({ sort: { ...defaults.sort } })}>
                {t('filters.sort.stat', { stat: statName(f.sort.key) })}
              </FilterChip>
            </Field>
          )}
          <Field label={t('filters.order.label')}>
            <Segmented
              label={t('filters.order.ariaLabel')}
              value={f.sort.dir}
              onChange={(dir) => set({ sort: { ...f.sort, dir } })}
              options={[
                {
                  value: 'desc',
                  title: t('filters.order.descending'),
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownWideNarrow className="size-3" />
                      {f.sort.by === 'bumped' ? t('filters.order.newest') : t('filters.order.highFirst')}
                    </span>
                  ),
                },
                {
                  value: 'asc',
                  title: t('filters.order.ascending'),
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpNarrowWide className="size-3" />
                      {f.sort.by === 'bumped' ? t('filters.order.oldest') : t('filters.order.lowFirst')}
                    </span>
                  ),
                },
              ]}
            />
          </Field>
        </Section>

        <Section
          {...section('Price', t('filters.sections.price'))}
          active={countDefined(f.priceText, f.hrMin, f.hrMax) + (f.hasBuyout !== defaults.hasBuyout ? 1 : 0)}
        >
          <Field label={t('filters.priceNote')}
            htmlFor="market-price-text">
            <Input
              id="market-price-text"
              placeholder={t('filters.priceNotePlaceholder')}
              maxLength={MAX_FILTER_TEXT}
              value={f.priceText ?? ''}
              onChange={(e) => set({ priceText: e.target.value.slice(0, MAX_FILTER_TEXT) || undefined })}
              className={fieldInputClass}
            />
          </Field>
          <RangeField
            label={t('filters.hrPrice')}
            step={0.1}
            min={f.hrMin}
            max={f.hrMax}
            onChange={(hrMin, hrMax) => set({ hrMin, hrMax })}
          />
          {facets?.price && facets.price.some((b) => b.count > 0) && (
            <Field label="">
              <PriceHistogram
                buckets={facets.price}
                hrMin={f.hrMin}
                hrMax={f.hrMax}
                onPick={(hrMin, hrMax) => set({ hrMin, hrMax })}
              />
            </Field>
          )}
          <TriField label={t('filters.hasBuyout')}
            value={f.hasBuyout}
            onChange={(hasBuyout) => set({ hasBuyout })} />
        </Section>

        <Section
          {...section('Seller', t('filters.sections.seller'))}
          active={
            countDefined(f.sellerUserId ?? f.sellerName) +
            (f.userOnlineSite !== defaults.userOnlineSite ? 1 : 0) +
            (f.userOnlineGame !== defaults.userOnlineGame ? 1 : 0)
          }
        >
          <Field label={t('filters.seller')}
            htmlFor="market-seller">
            <SellerInput
              userId={f.sellerUserId}
              name={f.sellerName}
              onChange={(sellerUserId, sellerName) => set({ sellerUserId, sellerName })}
            />
          </Field>
          <Field label={t('filters.onlineSite')}>
            <Segmented
              label={t('filters.onlineSiteLabel')}
              value={f.userOnlineSite}
              options={onlineOptions}
              onChange={(userOnlineSite) => set({ userOnlineSite })}
            />
          </Field>
          <Field label={t('filters.onlineGame')}>
            <Segmented
              label={t('filters.onlineGameLabel')}
              value={f.userOnlineGame}
              options={onlineOptions}
              onChange={(userOnlineGame) => set({ userOnlineGame })}
            />
          </Field>
        </Section>

        <Section
          {...section('Requirements', t('filters.sections.requirements'))}
          active={countDefined(req.levelMin, req.levelMax, req.strMin, req.strMax, req.dexMin, req.dexMax)}
        >
          <RangeField
            label={t('filters.level')}
            min={req.levelMin}
            max={req.levelMax}
            onChange={(levelMin, levelMax) => setReq({ levelMin, levelMax })}
          />
          <RangeField
            label={t('filters.strength')}
            min={req.strMin}
            max={req.strMax}
            onChange={(strMin, strMax) => setReq({ strMin, strMax })}
          />
          <RangeField
            label={t('filters.dexterity')}
            min={req.dexMin}
            max={req.dexMax}
            onChange={(dexMin, dexMax) => setReq({ dexMin, dexMax })}
          />
        </Section>
      </ScrollArea>
    </aside>
  );
}

/**
 * Seller name: the website username or an in-game account, matched exactly (any case) by the market service.
 * Typing applies it like the other text filters and replaces a seller picked with "browse seller" (by id).
 */
function SellerInput({
  userId,
  name,
  onChange,
}: {
  userId: string | undefined;
  name: string | undefined;
  onChange: (userId: string | undefined, name: string | undefined) => void;
}) {
  const { t } = useTranslation('market');
  return (
    <div className="relative">
      <Input
        id="market-seller"
        placeholder={t('filters.sellerPlaceholder')}
        maxLength={MAX_SELLER_NAME}
        value={name ?? ''}
        onChange={(e) => onChange(undefined, e.target.value.slice(0, MAX_SELLER_NAME) || undefined)}
        title={userId ? t('filters.sellerPicked') : undefined}
        className={cn(fieldInputClass, 'pr-6', userId && 'border-primary/50')}
      />
      {(name || userId) && (
        <ClearButton label={t('filters.clearSeller')}
          onClick={() => onChange(undefined, undefined)} />
      )}
    </div>
  );
}
