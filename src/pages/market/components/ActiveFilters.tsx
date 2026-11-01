import { useCallback } from 'react';
import { currentLocale, useTranslation } from '@/i18n';
import { CLASSES, basesForType, findTypeOption } from '../lib/catalog';
import type { ActiveFilter, ActiveFilterSpec, RangeField, TriField } from '../lib/active-filters';
import type { MarketFilters, OnlineFilter, Tri } from '../lib/types';
import { FilterChip } from './controls';
import { filterName } from './stat-text';

const TRI_LABELS: Record<TriField, string> = {
  corrupted: 'filters.corrupted',
  ethereal: 'filters.ethereal',
  desecrated: 'filters.desecrated',
  identified: 'filters.identified',
  hasBuyout: 'filters.hasBuyout',
};

const RANGE_LABELS: Record<RangeField, string> = {
  sockets: 'filters.sockets',
  hr: 'filters.hrPrice',
  level: 'filters.level',
  strength: 'filters.strength',
  dexterity: 'filters.dexterity',
};

/** "Sockets 3", "HR price ≤ 2", "Level 10–30". */
function rangeText(label: string, min: number | undefined, max: number | undefined): string {
  const n = (v: number) => v.toLocaleString(currentLocale(), { maximumFractionDigits: 2 });
  if (min !== undefined && max !== undefined)
    return min === max ? `${label} ${n(min)}` : `${label} ${n(min)}–${n(max)}`;
  if (min !== undefined) return `${label} ≥ ${n(min)}`;
  return `${label} ≤ ${n(max!)}`;
}

/** An applied filter as one short line ("Corrupted: No", "Life ≥ 100", "Shako"). */
export function useActiveFilterText(): (spec: ActiveFilterSpec) => string {
  const { t } = useTranslation(['market', 'common']);
  return useCallback(
    (spec: ActiveFilterSpec) => {
      const tri = (v: Tri) =>
        v === 'yes' ? t('common:actions.yes') : v === 'no' ? t('common:actions.no') : t('filters.any');
      const online = (v: OnlineFilter) =>
        v === 'online' ? t('filters.online') : v === 'offline' ? t('filters.offline') : t('filters.any');
      switch (spec.kind) {
        case 'itemName':
          return spec.value;
        case 'priceText':
          return `${t('filters.priceNote')}: “${spec.value}”`;
        case 'type':
          return findTypeOption(spec.code)?.label ?? spec.code;
        case 'base':
          return basesForType(spec.typeCode).find((b) => b.code === spec.code)?.label ?? spec.code;
        case 'rarity':
          return spec.value.join(', ');
        case 'class':
          return CLASSES.find((c) => c.value === spec.value)?.label ?? spec.value;
        case 'tri':
          return `${t(TRI_LABELS[spec.field])}: ${tri(spec.value)}`;
        case 'range':
          return rangeText(t(RANGE_LABELS[spec.field]), spec.min, spec.max);
        case 'age':
          return `${t('filters.listedWithin')}: ${t('filters.days', { count: spec.days })}`;
        case 'seller':
          return `${t('filters.seller')}: ${spec.name ?? t('filters.sellerPicked')}`;
        case 'online':
          return `${t(spec.field === 'site' ? 'filters.onlineSite' : 'filters.onlineGame')}: ${online(spec.value)}`;
        case 'stat': {
          const { row } = spec;
          const name =
            row.min === undefined && row.max === undefined
              ? filterName(row)
              : rangeText(filterName(row), row.min, row.max);
          return row.not ? t('filters.applied.not', { name }) : name;
        }
      }
    },
    [t],
  );
}

/**
 * A collapsed section's applied filters as removable chips under its header, so they show without opening it (a
 * price check opened in the market sets several at once). Clicking a chip opens the section.
 */
export function FilterSummary({
  filters,
  active,
  onChange,
  onOpen,
}: {
  filters: MarketFilters;
  /** This section's applied filters (non-empty). */
  active: ActiveFilter[];
  onChange: (next: MarketFilters) => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation('market');
  const text = useActiveFilterText();
  return (
    <ul aria-label={t('filters.applied.label')}
      className="flex flex-wrap gap-1">
      {active.map((a) => {
        const label = text(a.spec);
        return (
          <li key={a.id}
            className="min-w-0 max-w-full">
            <FilterChip
              title={label}
              removeLabel={t('filters.applied.remove', { filter: label })}
              onClick={onOpen}
              onRemove={() => onChange(a.clear(filters))}
            >
              {label}
            </FilterChip>
          </li>
        );
      })}
    </ul>
  );
}
