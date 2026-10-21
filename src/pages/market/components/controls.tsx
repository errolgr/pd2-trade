import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tri } from '../lib/types';

/*
 * Dense form controls for the market filter sidebar. Everything is h-7 / text-xs so the full site filter set
 * fits a ~300px column without scrolling past the stats section.
 */

/** Radix Select rejects '' as an item value; "Any" uses this sentinel. */
export const ANY = '__any';

export const fieldInputClass = 'h-7 rounded-md px-2 text-xs shadow-none';

/** Collapsible sidebar section with a count badge of its active filters. */
export function Section({
  title,
  active = 0,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  active?: number;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
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

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function TriField({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <Field label={label}>
      <Segmented label={label}
        value={value}
        options={TRI_OPTIONS}
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
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <NumberInput
          ariaLabel={`${label} min`}
          placeholder="min"
          value={min}
          step={step}
          onChange={(v) => onChange(v, max)}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <NumberInput
          ariaLabel={`${label} max`}
          placeholder="max"
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
  anyLabel = 'Any',
  disabled,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
  anyLabel?: string | null;
  disabled?: boolean;
}) {
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
  onKeyDown,
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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const show = open && (options.length > 0 || !!loading);
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
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (show && e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(options.length - 1, i + 1));
            } else if (show && e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
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
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // The input keeps focus; a click in the list must not blur it before the pick lands
        onMouseDown={(e) => e.preventDefault()}
        className="w-(--radix-popover-trigger-width) min-w-56 p-1"
      >
        <ul id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="max-h-64 overflow-y-auto">
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
      </PopoverContent>
    </Popover>
  );
}
