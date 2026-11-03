import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Button,
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@pd2-trader/ui';
import type { SimCharacter } from '@/lib/sim-characters';
import { ClassEmblem } from '@/pages/builds/components/parts';

/** class · level · Hardcore (· account when the user has several). */
function details(c: SimCharacter, withAccount: boolean) {
  return [c.className, c.level !== undefined && `Lvl ${c.level}`, c.hardcore && 'Hardcore', withAccount && c.account]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Horadric Sim character picker: a select-style trigger showing the chosen character, opening a list with its own
 * search box (name, class or account), arrow keys + Enter or click to pick.
 */
export function SimCharacterPicker({
  characters,
  value,
  onChange,
  className,
}: {
  characters: SimCharacter[];
  value: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const options = q
    ? characters.filter((c) => [c.name, c.className, c.account].some((s) => s?.toLowerCase().includes(q)))
    : characters;
  const manyAccounts = new Set(characters.map((c) => c.account.toLowerCase())).size > 1;
  const chosen = characters.find((c) => c.name === value);

  const toggle = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  return (
    <Popover open={open}
      onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="field"
          role="combobox"
          aria-expanded={open}
          aria-label="Character"
          // As a select's: the open list takes the overlay's keyboard
          data-keep-keyboard
          className={cn('w-full justify-start px-2 has-[>svg]:px-2', className)}
        >
          {chosen?.className && <ClassEmblem className={chosen.className}
            size={18} />}
          <span className="truncate">{value}</span>
          {chosen && (
            <span className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground">
              {details(chosen, false)}
            </span>
          )}
          <ChevronDown className="ml-auto size-4 shrink-0 opacity-50 transition-transform duration-(--dur-fast) ease-out [[data-state=open]>&]:rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start"
        data-keep-keyboard
        className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command label="Characters"
          shouldFilter={false}
          loop>
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search characters…"
            className="h-9 py-0"
          />
          <CommandList className="max-h-64 p-1">
            {options.map((c) => (
              <CommandItem
                key={`${c.account}/${c.name}`}
                value={`${c.account}/${c.name}`}
                onSelect={() => {
                  onChange(c.name);
                  toggle(false);
                }}
                className="cursor-pointer py-1"
              >
                {c.className ? (
                  <ClassEmblem className={c.className}
                    size={20} />
                ) : (
                  <span aria-hidden
                    className="w-5.5 shrink-0" />
                )}
                {/* PD2 names are at most 15 characters: the name stays whole, the details give way */}
                <span className={cn('shrink-0 text-sm', c.name === value && 'font-semibold')}>{c.name}</span>
                <span className="min-w-0 flex-1 truncate text-right text-2xs text-muted-foreground tabular-nums">
                  {details(c, manyAccounts)}
                </span>
                <Check
                  aria-hidden
                  className={cn('size-3.5 shrink-0 text-current', c.name === value ? 'opacity-100' : 'opacity-0')}
                />
              </CommandItem>
            ))}
            {options.length === 0 && (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">No ladder character matches</div>
            )}
          </CommandList>
          <div className="border-t border-border px-2.5 py-1.5 text-2xs text-muted-foreground">
            Ladder characters only
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
