import React, { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, Loader2, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { CLASSES, CORRUPTION_OPTIONS, ITEM_TYPES, RARITIES, basesForType, itemNameOptions } from '../lib/catalog';
import { DEFAULT_MAX_AGE_DAYS, withSource } from '../lib/defaults';
import type { MarketApi, MarketFilters, OnlineFilter, Rarity, SortBy } from '../lib/types';
import {
  Autocomplete,
  Field,
  RangeField,
  Section,
  Segmented,
  SelectField,
  TriField,
  fieldInputClass,
} from './controls';
import { StatFilters, type StatFiltersProps } from './StatFilters';
import { statName } from './stat-text';

const AGE_OPTIONS = [1, 3, 7, 14, 30, 90].map((d) => ({ value: String(d), label: d === 1 ? '1 day' : `${d} days` }));
const SORT_OPTIONS: { value: SortBy; label: string; title: string }[] = [
  { value: 'bumped', label: 'Bumped', title: 'Last bumped' },
  { value: 'price', label: 'Price', title: 'Price in HR (listings with an HR price only)' },
];

const rarityColor = (r: Rarity) => (r === 'Runeword' ? 'text-q-rune' : qualityColor(r));

/** Rarity: a multi-select dropdown (quality-coloured items with checkmarks), sized like the other selects. */
function RarityField({ value, onChange }: { value: Rarity[]; onChange: (v: Rarity[]) => void }) {
  const summary =
    value.length === 0 ? (
      <span className="text-muted-foreground">Any</span>
    ) : value.length <= 2 ? (
      RARITIES.filter((r) => value.includes(r)).map((r, i) => (
        <React.Fragment key={r}>
          {i > 0 && <span className="text-muted-foreground">, </span>}
          <span className={rarityColor(r)}>{r}</span>
        </React.Fragment>
      ))
    ) : (
      `${value.length} selected`
    );
  return (
    <Field label="Rarity">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Rarity"
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
            </DropdownMenuCheckboxItem>
          ))}
          {value.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-muted-foreground"
                onSelect={() => onChange([])}>
                Any rarity
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  );
}

const ONLINE_OPTIONS: { value: OnlineFilter; label: string }[] = [
  { value: 'all', label: 'Any' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];
const NAME_SUGGESTIONS = 30;

const countDefined = (...values: unknown[]) =>
  values.filter((v) => v !== undefined && v !== '' && v !== 'any' && v !== 'all').length;

export interface FilterSidebarProps {
  filters: MarketFilters;
  onChange: (next: MarketFilters) => void;
  /** Back to the defaults (keeps mode/source). */
  onReset: () => void;
  api: MarketApi | null;
  stats: Omit<StatFiltersProps, 'stats' | 'onChange'>;
}

/** Every site filter, dense and collapsible, plus the stats section. */
export function FilterSidebar({ filters: f, onChange, onReset, api, stats }: FilterSidebarProps) {
  const set = (changes: Partial<MarketFilters>) => onChange({ ...f, ...changes });
  const setReq = (changes: Partial<MarketFilters['requirements']>) =>
    set({ requirements: { ...f.requirements, ...changes } });
  const bases = useMemo(() => (f.typeCode ? basesForType(f.typeCode) : []), [f.typeCode]);
  const req = f.requirements;

  return (
    <aside aria-label="Search filters"
      className="flex h-full min-h-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <Segmented
          label="Listing source"
          value={f.source}
          onChange={(source) => onChange(withSource(f, source))}
          options={[
            { value: 'live', label: 'Live listings' },
            { value: 'archive', label: 'Sold archive', title: 'Sold / delisted listings' },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          onClick={onReset}
          title="Clear all filters"
        >
          <RotateCcw className="size-3.5" />
          Clear
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <Section title="Stats"
          active={f.stats.filter((s) => s.enabled).length}>
          <StatFilters {...stats}
            stats={f.stats}
            onChange={(next) => set({ stats: next })} />
        </Section>

        <Section
          title="Item"
          active={countDefined(f.itemName, f.typeCode, f.baseCode, req.class) + (f.rarity.length ? 1 : 0)}
        >
          <Field label="Name">
            <ItemNameInput value={f.itemName}
              onChange={(itemName) => set({ itemName })} />
          </Field>
          <SelectField
            label="Type"
            value={f.typeCode}
            options={ITEM_TYPES.map((t) => ({ value: t.code, label: t.label }))}
            onChange={(typeCode) => set({ typeCode, baseCode: undefined })}
          />
          <SelectField
            label="Base"
            value={f.baseCode}
            disabled={!f.typeCode}
            anyLabel={f.typeCode ? 'Any' : 'Pick a type first'}
            options={bases.map((b) => ({ value: b.code, label: b.label }))}
            onChange={(baseCode) => set({ baseCode })}
          />
          <RarityField value={f.rarity}
            onChange={(rarity) => set({ rarity })} />
          <SelectField
            label="Class"
            value={req.class}
            options={CLASSES.map((c) => ({ value: c.value, label: c.label }))}
            onChange={(v) => setReq({ class: CLASSES.find((c) => c.value === v)?.value })}
          />
        </Section>

        <Section
          title="Properties"
          active={
            countDefined(f.ethereal, f.corrupted, f.desecrated, f.identified, f.socketsMin, f.socketsMax) +
            f.corruptions.length
          }
        >
          <TriField label="Ethereal"
            value={f.ethereal}
            onChange={(ethereal) => set({ ethereal })} />
          <TriField label="Corrupted"
            value={f.corrupted}
            onChange={(corrupted) => set({ corrupted })} />
          <TriField label="Desecrated"
            value={f.desecrated}
            onChange={(desecrated) => set({ desecrated })} />
          <TriField label="Identified"
            value={f.identified}
            onChange={(identified) => set({ identified })} />
          <RangeField
            label="Sockets"
            min={f.socketsMin}
            max={f.socketsMax}
            onChange={(socketsMin, socketsMax) => set({ socketsMin, socketsMax })}
          />
          <Field label="Corruptions">
            <CorruptionsInput value={f.corruptions}
              onChange={(corruptions) => set({ corruptions })} />
          </Field>
        </Section>

        <Section title="Listing"
          active={f.maxAgeDays !== DEFAULT_MAX_AGE_DAYS[f.source] ? 1 : 0}>
          <Field label="Mode">
            <div className="flex gap-1">
              <Segmented
                label="Softcore or hardcore"
                value={f.hardcore ? 'hc' : 'sc'}
                onChange={(v) => set({ hardcore: v === 'hc' })}
                options={[
                  { value: 'sc', label: 'SC' },
                  { value: 'hc', label: 'HC' },
                ]}
              />
              <Segmented
                label="Ladder"
                value={f.ladder ? 'l' : 'nl'}
                onChange={(v) => set({ ladder: v === 'l' })}
                options={[
                  { value: 'l', label: 'L', title: 'Ladder' },
                  { value: 'nl', label: 'NL', title: 'Non-ladder' },
                ]}
              />
            </div>
          </Field>
          <SelectField
            label="Listed within"
            value={String(f.maxAgeDays)}
            options={
              AGE_OPTIONS.some((o) => o.value === String(f.maxAgeDays))
                ? AGE_OPTIONS
                : [...AGE_OPTIONS, { value: String(f.maxAgeDays), label: `${f.maxAgeDays} days` }]
            }
            anyLabel={null}
            onChange={(v) => v && set({ maxAgeDays: Number(v) })}
          />
          <Field label="Sort by">
            <Segmented
              label="Sort by"
              value={f.sort.by}
              options={SORT_OPTIONS}
              onChange={(by) => set({ sort: { by, dir: f.sort.dir } })}
            />
          </Field>
          {f.sort.by === 'stat' && f.sort.key && (
            <Field label="">
              <span className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-2 pr-0.5 text-[11px] text-primary">
                <span className="truncate">{`Stat: ${statName(f.sort.key)}`}</span>
                <button
                  type="button"
                  aria-label="Stop sorting by this stat"
                  title="Stop sorting by this stat"
                  onClick={() => set({ sort: { by: 'bumped', dir: 'desc' } })}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <X className="size-3" />
                </button>
              </span>
            </Field>
          )}
          <Field label="Order">
            <Segmented
              label="Sort order"
              value={f.sort.dir}
              onChange={(dir) => set({ sort: { ...f.sort, dir } })}
              options={[
                {
                  value: 'desc',
                  title: 'Descending',
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownWideNarrow className="size-3" />
                      {f.sort.by === 'bumped' ? 'Newest' : 'High first'}
                    </span>
                  ),
                },
                {
                  value: 'asc',
                  title: 'Ascending',
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpNarrowWide className="size-3" />
                      {f.sort.by === 'bumped' ? 'Oldest' : 'Low first'}
                    </span>
                  ),
                },
              ]}
            />
          </Field>
        </Section>

        <Section title="Price"
          active={countDefined(f.priceText, f.hrMin, f.hrMax, f.hasBuyout)}>
          <Field label="Price note"
            htmlFor="market-price-text">
            <Input
              id="market-price-text"
              placeholder="e.g. ist, 2 hr"
              value={f.priceText ?? ''}
              onChange={(e) => set({ priceText: e.target.value || undefined })}
              className={fieldInputClass}
            />
          </Field>
          <RangeField
            label="HR price"
            step={0.1}
            min={f.hrMin}
            max={f.hrMax}
            onChange={(hrMin, hrMax) => set({ hrMin, hrMax })}
          />
          <TriField label="Has buyout"
            value={f.hasBuyout}
            onChange={(hasBuyout) => set({ hasBuyout })} />
        </Section>

        <Section title="Seller"
          active={countDefined(f.sellerUserId, f.userOnlineSite, f.userOnlineGame)}>
          <Field label="Seller">
            <SellerInput
              api={api}
              userId={f.sellerUserId}
              name={f.sellerName}
              onChange={(sellerUserId, sellerName) => set({ sellerUserId, sellerName })}
            />
          </Field>
          <Field label="Online (site)">
            <Segmented
              label="User online on the site"
              value={f.userOnlineSite}
              options={ONLINE_OPTIONS}
              onChange={(userOnlineSite) => set({ userOnlineSite })}
            />
          </Field>
          <Field label="Online (game)">
            <Segmented
              label="User online in game"
              value={f.userOnlineGame}
              options={ONLINE_OPTIONS}
              onChange={(userOnlineGame) => set({ userOnlineGame })}
            />
          </Field>
        </Section>

        <Section
          title="Requirements"
          defaultOpen={false}
          active={countDefined(req.levelMin, req.levelMax, req.strMin, req.strMax, req.dexMin, req.dexMax)}
        >
          <RangeField
            label="Level"
            min={req.levelMin}
            max={req.levelMax}
            onChange={(levelMin, levelMax) => setReq({ levelMin, levelMax })}
          />
          <RangeField
            label="Strength"
            min={req.strMin}
            max={req.strMax}
            onChange={(strMin, strMax) => setReq({ strMin, strMax })}
          />
          <RangeField
            label="Dexterity"
            min={req.dexMin}
            max={req.dexMax}
            onChange={(dexMin, dexMax) => setReq({ dexMin, dexMax })}
          />
        </Section>
      </ScrollArea>
    </aside>
  );
}

/** Exact item name, site parity: free text shows suggestions; the filter applies once one is picked. */
function ItemNameInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const [text, setText] = useState(value ?? '');
  // A new value from outside (preset, payload, Clear) replaces the typed text
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setText(value ?? '');
  }
  const options = useMemo(() => itemNameOptions(text, NAME_SUGGESTIONS), [text]);
  return (
    <div className="relative">
      <Autocomplete
        ariaLabel="Item name"
        placeholder="Harlequin Crest…"
        value={text}
        onQuery={(q) => {
          setText(q);
          if (!q.trim()) onChange(undefined);
        }}
        options={options}
        optionKey={(o) => `${o.quality}:${o.name}`}
        onPick={(o) => onChange(o.name)}
        className={cn('pr-6', value && 'text-foreground')}
        renderOption={(o) => (
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                o.quality === 'Runeword' ? 'text-q-rune' : qualityColor(o.quality),
              )}
            >
              {o.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{o.quality}</span>
          </span>
        )}
      />
      {value && <ClearButton label="Clear item name"
        onClick={() => onChange(undefined)} />}
    </div>
  );
}

function CorruptionsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('');
  const options = useMemo(() => {
    const q = text.trim().toLowerCase();
    return CORRUPTION_OPTIONS.filter(
      (o) => !value.includes(o.value) && (!q || o.label.toLowerCase().includes(q)),
    ).slice(0, NAME_SUGGESTIONS);
  }, [text, value]);
  const labelOf = (v: string) => CORRUPTION_OPTIONS.find((o) => o.value === v)?.label ?? v;
  return (
    <div className="space-y-1">
      <Autocomplete
        ariaLabel="Add corruption"
        placeholder="Add corruption…"
        value={text}
        onQuery={setText}
        options={options}
        optionKey={(o) => o.value}
        onPick={(o) => {
          onChange([...value, o.value]);
          setText('');
        }}
        renderOption={(o) => <span className="text-q-corrupted">{o.label}</span>}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex h-5 items-center gap-0.5 rounded-full border border-destructive/30 bg-destructive/10 pl-2 pr-0.5 text-[11px] text-q-corrupted"
            >
              <span className="max-w-40 truncate">{labelOf(v)}</span>
              <button
                type="button"
                aria-label={`Remove ${labelOf(v)}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="inline-flex size-4 items-center justify-center rounded-full hover:bg-destructive/20"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Seller lookup (site parity: typing alone adds nothing). The PD2 API only matches exact usernames, so the
 * lookup runs on Enter / leaving the field and filters by the found user's id.
 */
function SellerInput({
  api,
  userId,
  name,
  onChange,
}: {
  api: MarketApi | null;
  userId: string | undefined;
  name: string | undefined;
  onChange: (userId: string | undefined, name: string | undefined) => void;
}) {
  const [text, setText] = useState(name ?? '');
  const [state, setState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const [shownName, setShownName] = useState(name);
  if (shownName !== name) {
    setShownName(name);
    setText(name ?? '');
  }

  const lookup = async () => {
    const q = text.trim();
    if (!q) {
      if (userId) onChange(undefined, undefined);
      setState('idle');
      return;
    }
    if (!api || q === name) return;
    setState('loading');
    try {
      const [user] = (await api.findUsers(q)) ?? [];
      if (user) {
        onChange(user._id, user.username);
        setState('idle');
      } else setState('missing');
    } catch {
      setState('missing');
    }
  };

  return (
    <div>
      <div className="relative">
        <Input
          aria-label="Seller username"
          aria-invalid={state === 'missing' || undefined}
          placeholder="Exact username, Enter"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setState('idle');
          }}
          onBlur={() => void lookup()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void lookup();
            }
          }}
          className={cn(fieldInputClass, 'pr-6', userId && 'border-primary/50')}
        />
        {state === 'loading' && (
          <Loader2 className="absolute top-1/2 right-1.5 size-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {state !== 'loading' && userId && (
          <ClearButton label="Clear seller"
            onClick={() => onChange(undefined, undefined)} />
        )}
      </div>
      {state === 'missing' && <p className="mt-0.5 text-[11px] text-destructive">{`No user named "${text.trim()}"`}</p>}
    </div>
  );
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
    >
      <X className="size-3" />
    </button>
  );
}
