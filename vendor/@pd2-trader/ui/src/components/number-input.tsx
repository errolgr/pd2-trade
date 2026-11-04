import * as React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { Button } from './button';
import { useFieldControl } from './field';
import { InputGroup, InputGroupInput } from './input-group';
import { commitDraft, readDraft } from './number-input-draft';

/** Longest unit the fixed unit slot shows whole ("Mana"); a longer one is cut short with a tooltip. */
const UNIT_FITS = 4;

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(v)));

interface NumberInputProps
  extends Omit<
    React.ComponentPropsWithoutRef<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'min' | 'max' | 'step' | 'prefix' | 'type'
  > {
  value: number;
  /** Gets an integer in `[min, max]`. */
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** ↑/↓ and −/+ step. */
  step?: number;
  /** Shift+↑/↓ and Shift-click step. */
  bigStep?: number;
  /** Names the value for assistive tech and the −/+ buttons ("Decrease Strength"). */
  label: string;
  /** Unit after the value ("s", "%", "lvl") in a fixed-width slot, so stacked inputs line up. */
  unit?: string;
  /** Text before the value ("Level"); a click on it focuses the field. */
  prefix?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Glow the box while the value is above zero (allocated points, active filters). */
  emphasize?: boolean;
  /** Classes for the value input (a wider box for 4-digit values). */
  inputClassName?: string;
}

/**
 * Integer stepper: − [value] +. Typing keeps the text as typed (a value in range applies at once); Enter or blur
 * clamps it, and out-of-range text is flagged meanwhile (`aria-invalid` + a "Min 10" hint); Escape reverts. ↑/↓ step
 * by `step`, Shift+↑/↓ and Shift-click by `bigStep`; focus selects the value. `className` goes on the box, `ref`
 * and other input props on the input.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onChange,
    min = 0,
    max = 99,
    step = 1,
    bigStep = 5,
    label,
    unit,
    prefix,
    size = 'md',
    disabled = false,
    emphasize = false,
    className,
    inputClassName,
    style,
    'aria-describedby': describedBy,
    ...props
  },
  ref,
) {
  const labels = useUiLabels();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const hintId = React.useId();
  // Inside a convenience Field the visible label names the input; `label` still names the −/+ buttons.
  const inField = useFieldControl<{ id?: string }>({}).id !== undefined;
  // The text while the field is being typed in; null shows `value`.
  const [draft, setDraft] = React.useState<string | null>(null);
  const read = draft === null ? null : readDraft(draft, min, max);
  const invalid = read !== null && !read.valid;
  const hint =
    read?.error === 'min'
      ? labels.numberMin(min)
      : read?.error === 'max'
        ? labels.numberMax(max)
        : read?.error === 'integer'
          ? labels.wholeNumber
          : null;

  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  const set = (v: number) => {
    if (!Number.isFinite(v)) return;
    const next = clampInt(v, min, max);
    if (next !== value) onChange(next);
  };
  const commit = () => {
    if (draft === null) return;
    set(commitDraft(draft, min, max, value));
    setDraft(null);
  };
  const stepBy = (e: React.MouseEvent | React.KeyboardEvent, dir: 1 | -1, from = value) => {
    setDraft(null);
    set(from + dir * (e.shiftKey ? bigStep : step));
  };

  const bigTip = bigStep > step ? labels.bigStep(bigStep) : undefined;
  const sm = size === 'sm';
  const on = emphasize && value > 0;
  const stepButton = cn(
    'h-full shrink-0 rounded-none px-0 text-muted-foreground has-[>svg]:px-0 hover:bg-accent hover:text-glow disabled:opacity-30 max-sm:w-10',
    sm ? 'w-6.5' : 'w-7.5',
  );
  const digits = Math.max(String(min).length, String(max).length);

  return (
    <InputGroup
      data-slot="number-input"
      data-disabled={disabled || undefined}
      className={cn(
        'inline-flex w-auto items-stretch max-sm:h-10',
        sm ? 'h-8' : 'h-9',
        on && 'border-glow/50 bg-glow/5',
        className,
      )}
    >
      <Button
        variant="ghost"
        className={cn(stepButton, 'rounded-l-md')}
        tabIndex={-1}
        aria-label={labels.decrease(label)}
        title={bigTip}
        disabled={disabled || value <= min}
        onClick={(e) => stepBy(e, -1)}
      >
        <MinusIcon className={sm ? 'size-3' : 'size-3.5'} />
      </Button>
      {prefix && (
        <span
          aria-hidden
          className="flex flex-auto shrink-0 cursor-text items-center justify-end border-l border-border/60 pr-1.5 pl-2 text-xs leading-none whitespace-nowrap text-muted-foreground select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {prefix}
        </span>
      )}
      <InputGroupInput
        ref={setRefs}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn(
          'min-w-0 flex-auto border-x border-border/60 px-0.5 text-center font-semibold tabular-nums',
          sm ? 'w-8.5 md:text-xs' : 'w-11.5',
          unit && 'border-r-0 pr-0.75 text-right',
          prefix && 'border-l-0 pr-2 pl-0 text-left',
          on && 'text-glow',
          inputClassName,
        )}
        // Prefixed: the box is as wide as the longest bound so "Level 12" reads as one value.
        style={prefix ? { width: `calc(${digits}ch + var(--spacing) * 2)`, ...style } : style}
        value={draft ?? String(value)}
        disabled={disabled}
        aria-label={inField || props['aria-labelledby'] ? undefined : label}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedBy, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const r = readDraft(text, min, max);
          if (r.valid && r.value !== null && r.value !== value) onChange(r.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            return;
          }
          if (e.key === 'Escape' && draft !== null) {
            // Revert the typing only: a dialog or panel around the input stays open.
            e.stopPropagation();
            setDraft(null);
            return;
          }
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          stepBy(e, e.key === 'ArrowUp' ? 1 : -1, read?.value ?? value);
        }}
        onFocus={(e) => e.target.select()}
        {...props}
      />
      {unit && (
        <span
          aria-hidden
          title={unit.length > UNIT_FITS ? unit : undefined}
          className={cn(
            'pointer-events-none flex w-9 shrink-0 items-center border-r border-border/60 pr-1 pl-px text-xs leading-none font-normal whitespace-nowrap text-muted-foreground',
            unit.length > UNIT_FITS && 'pointer-events-auto',
          )}
        >
          <span className="min-w-0 truncate">{unit}</span>
        </span>
      )}
      <Button
        variant="ghost"
        className={cn(stepButton, 'rounded-r-md')}
        tabIndex={-1}
        aria-label={labels.increase(label)}
        title={bigTip}
        disabled={disabled || value >= max}
        onClick={(e) => stepBy(e, 1)}
      >
        <PlusIcon className={sm ? 'size-3' : 'size-3.5'} />
      </Button>
      {hint && (
        <span
          id={hintId}
          role="status"
          className="pointer-events-none absolute top-full left-0 z-raised mt-0.5 rounded-sm bg-popover px-1.5 py-px text-2xs whitespace-nowrap text-destructive shadow-panel"
        >
          {hint}
        </span>
      )}
    </InputGroup>
  );
});

export { NumberInput, commitDraft, readDraft };
export type { NumberInputProps };
export type { NumberDraft, NumberDraftError } from './number-input-draft';
