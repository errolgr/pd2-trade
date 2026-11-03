import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  cn,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pd2-trader/ui';
import { DUR, EASE_OUT } from '@/lib/motion';
import { facetShare } from '../lib/facets';
import type { Tri } from '../lib/types';
import { useTranslation } from '@/i18n';
import { FACET_DIM, FacetHairline, FacetRowTip, FacetTip, facetFill, useFacetText } from './FacetCounts';

/*
 * Dense form controls for the market filter sidebar. Everything is h-7 / text-xs so the full site filter set
 * fits a ~300px column without scrolling past the stats section.
 */

/** Radix Select rejects '' as an item value; "Any" uses this sentinel. */
export const ANY = '__any';

export const fieldInputClass = 'h-7 rounded-md px-2 text-xs shadow-none';

/**
 * What a hovered empty-search suggestion would drop, marked in the sidebar: a Section by its title, a Field by its
 * label, a stat row by its id. Null: nothing hovered.
 */
export interface FilterHighlight {
  section?: string;
  field?: string;
  statId?: string;
}
export const FilterHighlightContext = React.createContext<FilterHighlight | null>(null);
/** A marked filter: an inset ring and tint, so nothing moves or gets clipped. */
export const FILTER_HIGHLIGHT_CLASS = 'rounded-md bg-primary/10 ring-1 ring-inset ring-primary/60';

/**
 * Collapsible sidebar section with a count badge of its active filters. Uncontrolled (`defaultOpen`) unless
 * `open` is given; `onOpenChange` hears every toggle either way.
 */
export function Section({
  title,
  active = 0,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  actions,
  children,
}: {
  title: string;
  active?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const id = useId();
  const highlighted = React.useContext(FilterHighlightContext)?.section === title;
  return (
    <section className="border-b border-border/60 last:border-b-0">
      <div
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 transition-colors duration-(--dur-fast)',
          highlighted && FILTER_HIGHLIGHT_CLASS,
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpenState(!open);
            onOpenChange?.(!open);
          }}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-2xs font-semibold uppercase tracking-wider text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronRight
            className={cn('size-3.5 shrink-0 transition-transform duration-(--dur-fast)', open && 'rotate-90')}
          />
          <span className="truncate">{title}</span>
          {active > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-3xs font-semibold tabular-nums text-primary">
              {active}
            </span>
          )}
        </button>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.med, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 px-2.5 pb-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Label on the left, control on the right — one line per filter. */
export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  const highlight = React.useContext(FilterHighlightContext);
  return (
    <div
      className={cn(
        'grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 transition-colors duration-(--dur-fast)',
        !!label && highlight?.field === label && FILTER_HIGHLIGHT_CLASS,
      )}
    >
      <label htmlFor={htmlFor}
        className="truncate text-xs text-muted-foreground">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A segment's facet look: hairline `share`, dimmed when it finds nothing, `text` its exact count (no facets: none). */
export interface SegmentFacet {
  text?: string;
  share: number;
  empty: boolean;
}

/** Small segmented control (the shared look of tri-states, mode switches and sort direction). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  selectedClassName,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string; facet?: SegmentFacet }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Extra classes for the selected option. */
  selectedClassName?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex h-7 w-full rounded-md border border-input bg-background/40 p-0.5', className)}
    >
      {options.map((o) => {
        const button = (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-label={o.facet?.text}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative min-w-0 flex-1 truncate rounded-sm px-1.5 text-2xs font-medium text-muted-foreground outline-none transition-[color,background-color,opacity] duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              value === o.value && cn('bg-accent text-accent-foreground shadow-xs', selectedClassName),
              o.facet?.empty && value !== o.value && FACET_DIM,
            )}
          >
            {o.label}
            {o.facet && <FacetHairline share={o.facet.share}
              inset={6} />}
          </button>
        );
        // Options with a facet always get their tooltip, so they keep focus when counts come and go
        return o.facet ? (
          <FacetTip key={o.value}
            text={o.facet.text}>
            {button}
          </FacetTip>
        ) : (
          button
        );
      })}
    </div>
  );
}

/**
 * Any / Yes / No; `counts` (facets) of Yes and No: hairlines as their share of both, the exact count on hover / focus.
 */
export function TriField({
  label,
  value,
  onChange,
  counts,
}: {
  label: string;
  value: Tri;
  onChange: (v: Tri) => void;
  counts?: { yes?: number; no?: number };
}) {
  const { t } = useTranslation(['market', 'common']);
  const facetText = useFacetText();
  const total = (counts?.yes ?? 0) + (counts?.no ?? 0);
  const facet = (text: string, count: number | undefined): SegmentFacet | undefined =>
    counts && {
      text: count === undefined ? undefined : facetText(text, count),
      share: facetShare(count, total),
      empty: count === 0,
    };
  const yes = t('common:actions.yes');
  const no = t('common:actions.no');
  const options = [
    { value: 'any' as const, label: t('filters.any') },
    { value: 'yes' as const, label: yes, facet: facet(yes, counts?.yes) },
    { value: 'no' as const, label: no, facet: facet(no, counts?.no) },
  ];
  return (
    <Field label={label}>
      <Segmented label={label}
        value={value}
        options={options}
        onChange={onChange} />
    </Field>
  );
}

/** Integer input where empty means "no bound". */
export function NumberInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  step,
  min,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  step?: number;
  min?: number;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      step={step}
      min={min}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value.trim();
        const n = raw === '' ? undefined : Number(raw);
        onChange(n === undefined || Number.isNaN(n) ? undefined : n);
      }}
      className={cn(
        fieldInputClass,
        'w-full min-w-0 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className,
      )}
    />
  );
}

/** "min – max" pair on one line. */
export function RangeField({
  label,
  min,
  max,
  onChange,
  step,
}: {
  label: string;
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  step?: number;
}) {
  const { t } = useTranslation('market');
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <NumberInput
          ariaLabel={t('controls.minLabel', { label })}
          placeholder={t('controls.min')}
          value={min}
          step={step}
          onChange={(v) => onChange(v, max)}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <NumberInput
          ariaLabel={t('controls.maxLabel', { label })}
          placeholder={t('controls.max')}
          value={max}
          step={step}
          onChange={(v) => onChange(min, v)}
        />
      </div>
    </Field>
  );
}

/**
 * Compact Select; `anyLabel` (default "Any") adds an entry mapped to undefined, `anyLabel: null` omits it. An
 * option's `count` (facets) shows in the list, not in the trigger.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  anyLabel: anyLabelProp,
  disabled,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string; count?: number }[];
  onChange: (v: string | undefined) => void;
  anyLabel?: string | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation('market');
  const anyLabel = anyLabelProp === undefined ? t('filters.any') : anyLabelProp;
  const peak = Math.max(0, ...options.map((o) => o.count ?? 0));
  return (
    <Field label={label}>
      <Select value={value ?? ANY}
        disabled={disabled}
        onValueChange={(v) => onChange(v === ANY ? undefined : v)}>
        <SelectTrigger aria-label={label}
          className="!h-7 w-full px-2 text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {anyLabel !== null && (
            <SelectItem value={ANY}
              className="text-xs">
              {anyLabel}
            </SelectItem>
          )}
          {options.map((o) => (
            <FacetSelectItem
              key={o.value}
              value={o.value}
              label={o.label}
              count={o.count}
              peak={peak}
              selected={o.value === value}
            />
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** A select option with its facet count (if any): row fill as its share of the busiest option, dimmed at 0. */
function FacetSelectItem({
  value,
  label,
  count,
  peak,
  selected,
}: {
  value: string;
  label: string;
  count: number | undefined;
  peak: number;
  selected: boolean;
}) {
  const facetText = useFacetText();
  const [focused, setFocused] = useState(false);
  const text = count === undefined ? undefined : facetText(label, count);
  return (
    <SelectItem
      value={value}
      // With a count, it is part of the option's name (Radix names options by their text alone)
      {...(text && { 'aria-label': text, 'aria-labelledby': undefined })}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={facetFill(facetShare(count, peak))}
      // The picked option stays readable even when it finds nothing
      className={cn('text-xs', count === 0 && !selected && FACET_DIM)}
      aside={text && <FacetRowTip text={text}
        open={focused} />}
    >
      {label}
    </SelectItem>
  );
}

/**
 * Text input with a suggestion list (arrow keys + Enter, or click). `onQuery` runs on every keystroke; the
 * caller supplies `options` for the current text. Picking calls `onPick`; Escape closes the list only.
 */
export function Autocomplete<T>({
  value,
  onQuery,
  options,
  onPick,
  renderOption,
  optionKey,
  placeholder,
  ariaLabel,
  inputRef,
  loading,
  className,
  header,
  onKeyDown,
  contentClassName,
  footer,
  listKey,
  minRows,
}: {
  value: string;
  onQuery: (q: string) => void;
  options: T[];
  onPick: (option: T) => void;
  renderOption: (option: T, active: boolean) => React.ReactNode;
  optionKey: (option: T) => string;
  placeholder?: string;
  ariaLabel: string;
  inputRef?: React.Ref<HTMLInputElement>;
  loading?: boolean;
  className?: string;
  /** Shown above the suggestions while the list is open (e.g. category tabs); clicks keep the input focused. */
  header?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Extra classes for the dropdown (e.g. wider than the input). */
  contentClassName?: string;
  /** Shown under the options while the list is open. */
  footer?: React.ReactNode;
  /** Identity of the option list (e.g. the open tab): a new one starts at its first row, scrolled to the top. */
  listKey?: string;
  /** Rows of height the list keeps (capped at its max height), so swapping `options` doesn't resize it. */
  minRows?: number;
}) {
  const [open, setOpen] = useState(false);
  const [activeRaw, setActive] = useState(0);
  const [shownListKey, setShownListKey] = useState(listKey);
  if (listKey !== shownListKey) {
    setShownListKey(listKey);
    setActive(0);
  }
  // Options can shrink under the highlight (new search); keep it on an existing row
  const active = Math.min(activeRaw, Math.max(0, options.length - 1));
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const keyboardMoved = useRef(false);
  const show = open && (options.length > 0 || !!loading);
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [listKey]);
  // Arrow keys keep the highlighted row in view (hover never scrolls the list under the pointer)
  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    listRef.current?.querySelector('[role="option"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  const pick = (option: T) => {
    onPick(option);
    setOpen(false);
    setActive(0);
  };

  return (
    <Popover open={show}
      onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          className={cn(fieldInputClass, className)}
          // The list opens on intent only (a click, typing, ArrowDown), never on focus: the overlay window losing
          // and regaining the keyboard re-focuses this input, which used to pop the list open over the stat rows
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!show && e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            } else if (show && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault();
              const next = e.key === 'ArrowDown' ? Math.min(options.length - 1, active + 1) : Math.max(0, active - 1);
              keyboardMoved.current = next !== active;
              setActive(next);
            } else if (show && e.key === 'Enter' && options[active]) {
              e.preventDefault();
              pick(options[active]);
            } else if (show && e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
            onKeyDown?.(e);
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        // A click in the list keeps the overlay's keyboard (and so this input's focus): releasing it blurred the
        // input and closed the list mid-click
        data-keep-keyboard
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // The input is the anchor, so Radix counts a click in it as outside: keep the list open
        onPointerDownOutside={(e) => {
          if ((e.target as Element | null)?.getAttribute?.('aria-controls') === listId) e.preventDefault();
        }}
        // The input keeps focus; a click in the list must not blur it before the pick lands
        onMouseDown={(e) => e.preventDefault()}
        // A closing list fades out in place: clicks go through it, not to a row the user no longer sees
        className={cn(
          'w-(--radix-popover-trigger-width) min-w-56 p-1 data-[state=closed]:pointer-events-none',
          contentClassName,
        )}
      >
        {header}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="max-h-64 overflow-y-auto"
          // Rows are 1.5rem (py-1 + text-xs line); max-h-64 is 16rem
          style={minRows ? { minHeight: `min(${minRows * 1.5}rem, 16rem)` } : undefined}
        >
          {loading && options.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>}
          {options.map((option, i) => (
            <li
              key={optionKey(option)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(option)}
              className={cn(
                'cursor-default rounded-sm px-2 py-1 text-xs',
                i === active && 'bg-accent text-accent-foreground',
              )}
            >
              {renderOption(option, i === active)}
            </li>
          ))}
        </ul>
        {footer}
      </PopoverContent>
    </Popover>
  );
}

/** ✕ inside the right edge of a text field (the field needs `relative` and right padding). */
export function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
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
