import React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger, Input, cn } from '@pd2-trader/ui';
import { CORRUPTED_ZONES } from '@/lib/corrupted-zones';
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
        <Button
          type="button"
          variant="field"
          aria-label={t('zonePicker.triggerLabel')}
          className="w-control px-3 has-[>svg]:px-3"
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
            {value.length === 0
              ? t('zonePicker.pick')
              : value.length === 1
                ? value[0]
                : t('zonePicker.count', { count: value.length })}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end"
        className="w-95 p-0">
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
              <Button
                key={zone}
                type="button"
                variant="ghost"
                size="row"
                role="option"
                aria-selected={on}
                onClick={() => toggle(zone)}
                className="rounded-sm focus-visible:bg-accent focus-visible:ring-0 aria-selected:bg-transparent aria-selected:text-foreground aria-selected:hover:bg-accent"
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
              </Button>
            );
          })}
        </div>
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{t('zonePicker.followedCount', { count: value.length })}</span>
            <Button type="button"
              variant="quiet"
              size="inline"
              className="text-xs font-normal"
              onClick={() => onChange([])}>
              {t('common:actions.clear')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
