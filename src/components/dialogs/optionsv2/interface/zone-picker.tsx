import React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CORRUPTED_ZONES } from '@/lib/corrupted-zones';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface ZonePickerProps {
  value: string[];
  onChange: (zones: string[]) => void;
}

/** Multi-select dropdown of the corrupted zone groups: a search box over a checkable list. */
export function ZonePicker({ value, onChange }: ZonePickerProps) {
  const { t } = useTranslation('settings');
  const [query, setQuery] = React.useState('');
  const needle = query.trim().toLowerCase();
  const shown: readonly string[] = needle
    ? CORRUPTED_ZONES.filter((zone) => zone.toLowerCase().includes(needle))
    : CORRUPTED_ZONES;
  const toggle = (zone: string) => onChange(value.includes(zone) ? value.filter((z) => z !== zone) : [...value, zone]);

  return (
    <Popover onOpenChange={(open) => !open && setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('zonePicker.triggerLabel')}
          className="flex h-9 w-[220px] items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring hover:border-ring/60"
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
            {value.length === 0
              ? t('zonePicker.pick')
              : value.length === 1
                ? value[0]
                : t('zonePicker.count', { count: value.length })}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end"
        className="w-[380px] p-0">
        <div className="relative border-b border-border p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('zonePicker.search')}
            aria-label={t('zonePicker.search')}
            className="h-8 pl-7"
          />
        </div>
        <div
          role="listbox"
          aria-label={t('zonePicker.listLabel')}
          aria-multiselectable
          className="max-h-72 overflow-y-auto p-1"
        >
          {shown.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">{t('zonePicker.noMatch')}</p>
          )}
          {shown.map((zone) => {
            const on = value.includes(zone);
            return (
              <button
                key={zone}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(zone)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                    on ? 'border-q-corrupted-zone bg-q-corrupted-zone text-background' : 'border-border',
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span className={cn('truncate', on && 'text-q-corrupted-zone')}>{zone}</span>
              </button>
            );
          })}
        </div>
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{t('zonePicker.followedCount', { count: value.length })}</span>
            <button type="button"
              className="hover:text-foreground"
              onClick={() => onChange([])}>
              {t('common:actions.clear')}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
