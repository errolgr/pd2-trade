import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { SimCharacter } from '@/lib/sim-characters';
import { cn } from '@/lib/utils';
import { ClassEmblem } from '@/pages/builds/components/parts';
import { Autocomplete } from '@/pages/market/components/controls';

/**
 * Searchable Horadric Sim character picker (the market browser's autocomplete): a click lists every character,
 * typing narrows it by name, class or account. Leaving it without a pick shows the chosen character again.
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
  const [text, setText] = useState(value);
  // A new value from outside (preselection, a pick) replaces the typed text
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setText(value);
  }
  const query = text.trim().toLowerCase();
  const options =
    text === value || !query
      ? characters
      : characters.filter((c) => [c.name, c.className, c.account].some((s) => s?.toLowerCase().includes(query)));
  const manyAccounts = new Set(characters.map((c) => c.account.toLowerCase())).size > 1;
  // The chosen character's portrait while it's shown; the search icon while typing
  const chosenClass = text === value ? characters.find((c) => c.name === value)?.className : undefined;

  return (
    <div
      className={cn('relative', className)}
      // Focus selects the name, so typing searches instead of appending to it
      onFocus={(e) => e.target instanceof HTMLInputElement && e.target.select()}
      onBlur={() => setText(value)}
    >
      <span className="pointer-events-none absolute top-1/2 left-2 flex -translate-y-1/2 items-center">
        {chosenClass ? (
          <ClassEmblem className={chosenClass}
            size={18} />
        ) : (
          <Search aria-hidden
            className="ml-0.5 size-3.5 text-muted-foreground" />
        )}
      </span>
      <Autocomplete<SimCharacter>
        ariaLabel="Character"
        placeholder="Search characters…"
        value={text}
        onQuery={setText}
        options={options}
        optionKey={(c) => `${c.account}/${c.name}`}
        onPick={(c) => {
          setText(c.name);
          onChange(c.name);
        }}
        className="h-9 pl-9 text-sm"
        renderOption={(c) => (
          <span className="flex items-center gap-2 py-0.5">
            {c.className ? (
              <ClassEmblem className={c.className}
                size={20} />
            ) : (
              <span aria-hidden
                className="w-[22px] shrink-0" />
            )}
            {/* PD2 names are at most 15 characters: the name stays whole, the details give way */}
            <span className={cn('shrink-0 text-[13px]', c.name === value && 'font-semibold')}>{c.name}</span>
            <span className="min-w-0 flex-1 truncate text-right text-[11px] text-muted-foreground tabular-nums">
              {[
                c.className,
                c.level !== undefined && `Lvl ${c.level}`,
                c.hardcore && 'Hardcore',
                manyAccounts && c.account,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        )}
        footer={
          <div className="mt-1 border-t border-border px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
            Ladder characters only
          </div>
        }
      />
    </div>
  );
}
