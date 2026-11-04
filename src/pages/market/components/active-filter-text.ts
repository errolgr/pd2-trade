import { useCallback } from 'react';
import { currentLocale, useTranslation } from '@/i18n';
import { CLASSES, basesForType, findTypeOption } from '../lib/catalog';
import type { ActiveFilterSpec, RangeField, TriField } from '../lib/active-filters';
import type { OnlineFilter, Tri } from '../lib/types';
import type { FilterHighlight } from './controls';
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

/** The sidebar section (its `filters.sections.*` key) each kind of filter sits in. */
function sectionOf(spec: ActiveFilterSpec): string | undefined {
  switch (spec.kind) {
    case 'itemName':
      return undefined; // the top bar's search, not the sidebar
    case 'stat':
      return 'stats';
    case 'type':
    case 'base':
    case 'rarity':
    case 'class':
      return 'item';
    case 'tri':
      return spec.field === 'hasBuyout' ? 'price' : 'properties';
    case 'range':
      return spec.field === 'sockets' ? 'properties' : spec.field === 'hr' ? 'price' : 'requirements';
    case 'age':
      return 'listing';
    case 'priceText':
      return 'price';
    case 'seller':
    case 'online':
      return 'seller';
  }
}

/** The sidebar FilterRow label key of each kind of filter (stat rows are marked by their id instead). */
function fieldOf(spec: ActiveFilterSpec): string | undefined {
  switch (spec.kind) {
    case 'type':
      return 'filters.type';
    case 'base':
      return 'filters.base';
    case 'rarity':
      return 'filters.rarity';
    case 'class':
      return 'filters.class';
    case 'tri':
      return TRI_LABELS[spec.field];
    case 'range':
      return RANGE_LABELS[spec.field];
    case 'age':
      return 'filters.listedWithin';
    case 'priceText':
      return 'filters.priceNote';
    case 'seller':
      return 'filters.seller';
    case 'online':
      return spec.field === 'site' ? 'filters.onlineSite' : 'filters.onlineGame';
    default:
      return undefined;
  }
}

/** Where a filter shows in the sidebar, to mark it while a suggestion to drop it is hovered. */
export function useFilterHighlight(): (spec: ActiveFilterSpec) => FilterHighlight {
  const { t } = useTranslation('market');
  return useCallback(
    (spec: ActiveFilterSpec) => {
      const section = sectionOf(spec);
      const field = fieldOf(spec);
      return {
        ...(section && { section: t(`filters.sections.${section}`) }),
        ...(field && { field: t(field) }),
        ...(spec.kind === 'stat' && { statId: spec.row.id }),
      };
    },
    [t],
  );
}

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
