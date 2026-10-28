import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tri } from '../lib/types';
import { useTranslation } from '@/i18n';

/*
 * Dense form controls for the market filter sidebar. Everything is h-7 / text-xs so the full site filter set
 * fits a ~300px column without scrolling past the stats section.
 */

/** Radix Select rejects '' as an item value; "Any" uses this sentinel. */
export const ANY = '__any';

export const fieldInputClass = 'h-7 rounded-md px-2 text-xs shadow-none';

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
  return (
    <section className="border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpenState(!open);
            onOpenChange?.(!open);
          }}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronRight
            className={cn('size-3.5 shrink-0 transition-transform duration-(--dur-fast)', open && 'rotate-90')}
          />
          <span className="truncate">{title}</span>
          {active > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold tabular-nums text-primary">
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
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor}
        className="truncate text-xs text-muted-foreground">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Small segmented control (the shared look of tri-states, mode switches and sort direction). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex h-7 w-full rounded-md border border-input bg-background/40 p-0.5', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-w-0 flex-1 truncate rounded-[5px] px-1.5 text-[11px] font-medium text-muted-foreground outline-none transition-[color,background-color] duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
            value === o.value && 'bg-accent text-accent-foreground shadow-xs',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TriField({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  const { t } = useTranslation(['market', 'common']);
  const options: { value: Tri; label: string }[] = [
    { value: 'any', label: t('filters.any') },
    { value: 'yes', label: t('common:actions.yes') },
    { value: 'no', label: t('common:actions.no') },
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

/** Compact Select; `anyLabel` (default "Any") adds an entry mapped to undefined, `anyLabel: null` omits it. */
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
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
  anyLabel?: string | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation('market');
  const anyLabel = anyLabelProp === undefined ? t('filters.any') : anyLabelProp;
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
            <SelectItem key={o.value}
              value={o.value}
              className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
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
