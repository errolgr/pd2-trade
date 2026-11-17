import React from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SearchPopover, useSearchPopover } from '@/components/custom/SearchPopover';
import { popIn } from '@/lib/motion';
import { useTranslation } from '@/i18n';
import { SITE_ITEM_TYPES } from '@/pages/market/lib/catalog.data';
import { optionCodes } from '@/pages/market/lib/catalog';
import {
  addDelistException,
  isStackableCurrency,
  removeDelistException,
  type DelistException,
} from '@/pages/delist/delist-exemptions';

/** Most search results listed at once. */
const MAX_RESULTS = 50;

let bases: DelistException[] | null = null;

/** Every base the site's Type/Base catalog names, once per name (codes merged: every T5 map is "Map"), by name. */
function catalogBases(): DelistException[] {
  if (bases) return bases;
  const byName = new Map<string, Set<string>>();
  for (const type of SITE_ITEM_TYPES) {
    for (const base of type.bases) {
      if (!base.label) continue;
      let codes = byName.get(base.label);
      if (!codes) byName.set(base.label, (codes = new Set()));
      for (const code of optionCodes(base.code)) codes.add(code);
    }
  }
  bases = [...byName]
    .map(([name, codes]) => ({ name, codes: [...codes] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return bases;
}

interface DelistExceptionsProps {
  value: DelistException[];
  onChange: (next: DelistException[]) => void;
}

/**
 * "Never delist these": the exception list as chips (× removes one) and "+ Add", a search over the catalog's item
 * bases (stackable currency before anything is typed).
 */
export function DelistExceptions({ value, onChange }: DelistExceptionsProps) {
  const { t } = useTranslation('settings');
  const search = useSearchPopover();
  const needle = search.query.trim().toLowerCase();
  const listed = new Set(value.map((entry) => entry.name));
  const options = search.open
    ? catalogBases()
        .filter((base) =>
          needle ? base.name.toLowerCase().includes(needle) : base.codes.some((code) => isStackableCurrency(code)),
        )
        .filter((base) => !listed.has(base.name))
        .slice(0, MAX_RESULTS)
    : [];

  return (
    <div className="flex min-h-[44px] w-full flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/40 p-2">
      <AnimatePresence initial={false}>
        {value.map((entry) => (
          <motion.div key={entry.name}
            layout
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit="exit">
            <Badge variant="secondary"
              className="flex items-center gap-1 py-1 pr-1 pl-2.5">
              {entry.name}
              <button
                type="button"
                aria-label={t('market.listings.autoDelist.exceptions.remove', { name: entry.name })}
                onClick={() => onChange(removeDelistException(value, entry.codes))}
                className="ml-0.5 rounded-full p-0.5 text-muted-foreground outline-none transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
      {value.length === 0 && (
        <span className="px-1 text-xs text-muted-foreground">{t('market.listings.autoDelist.exceptions.empty')}</span>
      )}
      <SearchPopover
        state={search}
        label={t('market.listings.autoDelist.exceptions.label')}
        placeholder={t('market.listings.autoDelist.exceptions.search')}
        contentClassName="w-64"
        inputClassName="h-9 text-sm"
        listClassName="max-h-64"
        trigger={
          <button
            type="button"
            aria-expanded={search.open}
            // As a select's: the open list takes the overlay's keyboard
            data-keep-keyboard
            className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:border-ring/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Plus className="size-3.5" />
            {t('market.listings.autoDelist.exceptions.add')}
          </button>
        }
      >
        {options.map((base) => (
          <Command.Item
            key={base.name}
            value={base.name}
            onSelect={() => {
              onChange(addDelistException(value, base));
              search.setOpen(false);
            }}
            className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-[13px] outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            {base.name}
          </Command.Item>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            {t('market.listings.autoDelist.exceptions.noMatch')}
          </div>
        )}
      </SearchPopover>
    </div>
  );
}
