import React, { useCallback, useState } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Open state and search text of a SearchPopover; closing it clears the search. */
export interface SearchPopoverState {
  open: boolean;
  setOpen: (next: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
}

export function useSearchPopover(): SearchPopoverState {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState('');
  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setQuery('');
  }, []);
  return { open, setOpen, query, setQuery };
}

/** Keys the list moves its highlight with (cmdk's vim bindings are Ctrl+J/K/N/P). */
const NAV_KEYS: Record<string, true> = { ArrowUp: true, ArrowDown: true, Home: true, End: true };

/**
 * A select-style list with its own search box at the top: `trigger` opens it, the caller filters its
 * `Command.Item` children by `state.query`. Arrow keys + Enter or click pick, Escape closes. The open list takes
 * the overlay's keyboard (data-keep-keyboard; give the trigger the attribute too), so typing reaches the search box
 * instead of the game. `highlighted` / `onHighlight` follow the row the arrow keys or the pointer are on;
 * `onNavigate` hears a navigation key or pointer move just before the list moves the highlight.
 */
export function SearchPopover({
  state,
  trigger,
  label,
  placeholder,
  highlighted,
  onHighlight,
  onNavigate,
  footer,
  contentClassName,
  inputClassName,
  listClassName,
  children,
}: {
  state: SearchPopoverState;
  trigger: React.ReactElement;
  label: string;
  placeholder: string;
  highlighted?: string;
  onHighlight?: (value: string) => void;
  onNavigate?: () => void;
  footer?: React.ReactNode;
  contentClassName?: string;
  inputClassName?: string;
  listClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover open={state.open}
      onOpenChange={state.setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start"
        data-keep-keyboard
        className={cn('p-0', contentClassName)}>
        <Command
          label={label}
          shouldFilter={false}
          loop
          value={highlighted}
          onValueChange={onHighlight}
          // Escape closes the list even when a row's tooltip is open (Radix lets only the topmost layer, the
          // tooltip, see it)
          onKeyDown={(e) => {
            if (NAV_KEYS[e.key] || (e.ctrlKey && 'jknp'.includes(e.key))) onNavigate?.();
            if (e.key !== 'Escape') return;
            e.preventDefault();
            state.setOpen(false);
          }}
          onPointerMoveCapture={onNavigate}
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5">
            <Search aria-hidden
              className="size-3.5 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={state.query}
              onValueChange={state.setQuery}
              placeholder={placeholder}
              className={cn(
                'min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
                inputClassName,
              )}
            />
          </div>
          <Command.List className={cn('overflow-y-auto p-1', listClassName)}>{children}</Command.List>
          {footer}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
