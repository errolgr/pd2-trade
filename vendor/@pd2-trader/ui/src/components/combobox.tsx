import * as React from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { labelRank, matchSpans, queryWords, searchOptions, type SearchableOption } from './combobox-search';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './command';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

const PAGE = 10;
const FIELD_ICON_PX = 20;
const ROW_ICON_PX = 24;

const itemValue = (i: number) => `o${i}`;

type ComboboxValue = string | number;

interface ComboboxOption<V extends ComboboxValue = string> extends SearchableOption {
  value: V;
  /** Searched, shown muted at the row's end (not when it repeats the group heading). */
  hint?: string;
  /** Group heading; options of a group should be adjacent. */
  group?: string;
  /** Extra searched words that are not shown ("rune 30" for Ber). */
  keywords?: string;
  disabled?: boolean;
  /** Classes for the label, in rows and in the closed field (a quality color: `text-q-unique`). */
  className?: string;
}

interface ComboboxProps<V extends ComboboxValue = string>
  extends Omit<
    React.ComponentPropsWithoutRef<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'children' | 'placeholder'
  > {
  options: readonly ComboboxOption<V>[];
  /** The selected option's value, or null. */
  value: V | null;
  /**
   * Called with the picked option (or `null, null` from the clear button). `NoInfer`: V comes from `options`, so
   * passing a `useState` setter works under non-strict consumer configs too.
   */
  onChange: (value: NoInfer<V> | null, option: ComboboxOption<NoInfer<V>> | null) => void;
  /** Shown while nothing is selected (default: UiLabels `searchPlaceholder`). */
  placeholder?: string;
  /** Shown when nothing matches (default: UiLabels `noMatches`). */
  emptyText?: React.ReactNode;
  /** Most rows rendered; the rest are counted in a "N more — keep typing" footer. */
  limit?: number;
  /** Leading icon for an option, `px` tall: 24 in rows, 20 in the closed field for the selected option. */
  renderIcon?: (option: ComboboxOption<V>, px: number) => React.ReactNode;
  /** While a query is typed, drop group headings and rank matches across groups (name the group in `hint`). */
  flatSearch?: boolean;
  /** Adds a clear (×) button while something is selected. */
  clearable?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/**
 * Searchable single-select (ARIA 1.2 combobox + listbox) on `Command` + `Popover`. The input is the field: closed it
 * shows the selected label, typing filters (every query word must match the label, hint or keywords; label matches
 * rank first, the matched text is highlighted). ↑/↓/PageUp/PageDown move, Enter picks, Escape closes and reverts,
 * Tab closes. `className` goes on the wrapper; `ref`, `id`, `aria-*` and other input props on the input.
 */
const Combobox = React.forwardRef(function Combobox<V extends ComboboxValue = string>(
  {
    options,
    value,
    onChange,
    placeholder,
    emptyText,
    limit = 80,
    renderIcon,
    flatSearch = false,
    clearable = false,
    size = 'md',
    disabled = false,
    className,
    onKeyDown,
    onFocus,
    onClick,
    ...props
  }: ComboboxProps<V>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const labels = useUiLabels();
  const selected = React.useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [listId, setListId] = React.useState<string>();
  const [activeId, setActiveId] = React.useState<string>();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  // The list mounts a render after `open` (portal), so it is state, not a ref: the effect below reruns once it exists.
  const [list, setList] = React.useState<HTMLDivElement | null>(null);

  const words = React.useMemo(() => queryWords(query), [query]);
  const searching = words.length > 0;
  const headed = !(flatSearch && searching);
  const matches = React.useMemo(() => searchOptions(options, query, { flat: flatSearch }), [options, query, flatSearch]);
  const shown = matches.slice(0, limit);
  const placeholderText = placeholder ?? labels.searchPlaceholder;

  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  // The listbox id and the active row's id are cmdk's: read them back for the input's ARIA wiring and keep the row
  // in view.
  React.useLayoutEffect(() => {
    if (!open || !list) {
      setActiveId(undefined);
      return;
    }
    setListId(list.id || undefined);
    const row = list.querySelector<HTMLElement>(`[data-value="${itemValue(active)}"]`);
    setActiveId(row?.id || undefined);
    if (active === 0) list.scrollTop = 0;
    else row?.scrollIntoView({ block: 'nearest' });
  }, [active, open, query, list]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    const i = shown.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
  };
  const close = () => {
    setOpen(false);
    setQuery('');
    // Still focused (Escape, Enter, a click on a row): the field shows the pick, selected, so typing starts a new search.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) input.select();
    });
  };
  const pick = (o: ComboboxOption<V>) => {
    if (o.disabled) return;
    onChange(o.value, o);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Home' || e.key === 'End') {
      // Caret keys in the field, not list navigation (cmdk's root would take them).
      e.stopPropagation();
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp')) {
      e.preventDefault();
      openList();
      return;
    }
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      const page = e.key === 'PageDown' ? PAGE : -PAGE;
      setActive((a) => Math.min(shown.length - 1, Math.max(0, a + page)));
    } else if (e.key === 'Tab') {
      if (open) close();
    } else if (e.key === 'Enter' && !open) {
      // Nothing to pick: let the Enter reach the form (cmdk's root would swallow it).
      e.stopPropagation();
    }
  };

  const fieldIcon = renderIcon && selected && !open ? renderIcon(selected, FIELD_ICON_PX) : null;
  const sm = size === 'sm';

  // Rows in sections: one per group (headed), or label matches then "Other matches" (flat search).
  type Section = { key: string; group?: string; other: boolean; heading?: string; rows: { option: ComboboxOption<V>; index: number }[] };
  const sections: Section[] = [];
  shown.forEach((option, index) => {
    const last = sections[sections.length - 1];
    const other = !headed && labelRank(option.label, words) === 3;
    const starts = headed ? !last || option.group !== last.group : !last || (other && !last.other);
    if (starts) {
      const heading = headed ? option.group : other && last ? labels.otherMatches : undefined;
      sections.push({ key: `s${sections.length}`, group: option.group, other, heading, rows: [] });
    }
    sections[sections.length - 1].rows.push({ option, index });
  });

  return (
    <Command
      ref={wrapRef}
      data-slot="combobox"
      shouldFilter={false}
      value={itemValue(active)}
      onValueChange={(v) => {
        const i = Number(v.slice(1));
        if (Number.isInteger(i)) setActive(i);
      }}
      label={props['aria-label'] ?? placeholderText}
      className={cn('relative h-auto min-w-0 overflow-visible rounded-none bg-transparent text-foreground', className)}
    >
      <Popover open={open}
        onOpenChange={(o) => !o && close()}>
        <PopoverAnchor asChild>
          <InputGroup data-disabled={disabled || undefined}
            className={cn(sm && 'h-8')}>
            <InputGroupAddon className={cn(fieldIcon && 'pl-1.5')}>
              {fieldIcon ?? <SearchIcon aria-hidden />}
            </InputGroupAddon>
            <InputGroupInput
              ref={setRefs}
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={open ? activeId : undefined}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              placeholder={selected ? selected.label : placeholderText}
              value={open ? query : (selected?.label ?? '')}
              className={cn('truncate', sm && 'md:text-xs', selected && !open && selected.className)}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                if (!open) setOpen(true);
              }}
              onFocus={(e) => {
                onFocus?.(e);
                openList();
              }}
              onClick={(e) => {
                onClick?.(e);
                if (!open) openList();
              }}
              onKeyDown={handleKeyDown}
              {...props}
            />
            <InputGroupAddon align="inline-end">
              {clearable && selected && !open && !disabled ? (
                <InputGroupButton size="icon-xs"
                  aria-label={labels.clear}
                  onClick={() => onChange(null, null)}>
                  <XIcon />
                </InputGroupButton>
              ) : (
                <ChevronDownIcon aria-hidden
                  className="pointer-events-none size-3.5" />
              )}
            </InputGroupAddon>
          </InputGroup>
        </PopoverAnchor>
        <PopoverContent
          data-slot="combobox-content"
          data-keep-keyboard
          align="start"
          collisionPadding={8}
          className="w-max max-w-140 min-w-95 p-0 max-sm:w-viewport max-sm:max-w-viewport max-sm:min-w-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // Escape (Radix listens on the document, capture phase) closes and reverts the list only: stopping it
          // there keeps it from the panel's and any dialog's Escape handlers.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onInteractOutside={(e) => {
            if (e.target instanceof Node && wrapRef.current?.contains(e.target)) e.preventDefault();
          }}
        >
          <CommandList
            ref={setList}
            className="max-h-none min-w-(--radix-popover-trigger-width) overscroll-contain p-1"
            // 70vh, or less when the window has less room on the chosen side (Radix measures it).
            style={{ maxHeight: 'min(70vh, var(--radix-popover-content-available-height))' }}
          >
            <CommandEmpty className="px-2.5 py-2 text-left text-xs">{emptyText ?? labels.noMatches}</CommandEmpty>
            {sections.map((section) => (
              <CommandGroup
                key={section.key}
                heading={section.heading}
                className="overflow-visible p-0 [&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:-top-1 [&_[cmdk-group-heading]]:z-raised [&_[cmdk-group-heading]]:bg-popover [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:tracking-caps [&_[cmdk-group-heading]]:uppercase"
              >
                {section.rows.map(({ option, index }) => {
                  const hint = option.hint && !(headed && option.hint === option.group) ? option.hint : null;
                  return (
                    <CommandItem
                      key={String(option.value)}
                      value={itemValue(index)}
                      disabled={option.disabled}
                      className={cn(
                        'cursor-pointer gap-2 px-2.5 py-1.5 max-sm:min-h-10',
                        renderIcon && 'gap-3 py-1 pl-1.5',
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => pick(option)}
                    >
                      {renderIcon?.(option, ROW_ICON_PX)}
                      <span className={cn('min-w-0 flex-auto truncate', option.className)}>
                        <MatchText text={option.label}
                          words={words} />
                      </span>
                      {hint && <span className="shrink-0 text-2xs text-muted-foreground">{hint}</span>}
                      {option.value === value && <CheckIcon className="size-3.5 text-glow" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {matches.length > shown.length && (
              <div role="presentation"
                className="px-2.5 py-2 text-xs text-muted-foreground">
                {labels.moreMatches(matches.length - shown.length)}
              </div>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}) as (<V extends ComboboxValue = string>(
  props: ComboboxProps<V> & { ref?: React.Ref<HTMLInputElement> },
) => React.ReactElement) & { displayName?: string };
Combobox.displayName = 'Combobox';

/** `text` with the spans matching the query `words` in `<mark>`. */
function MatchText({ text, words }: { text: string; words: readonly string[] }) {
  const spans = words.length ? matchSpans(text, words) : [];
  if (!spans.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const [s, e] of spans) {
    if (s > at) out.push(text.slice(at, s));
    out.push(
      <mark key={s}
        className="bg-transparent p-0 font-semibold text-glow">
        {text.slice(s, e)}
      </mark>,
    );
    at = e;
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

export { Combobox, labelRank, matchSpans, queryWords, searchOptions };
export type { ComboboxOption, ComboboxProps, ComboboxValue, SearchableOption };
