import type { TFunction } from 'i18next';
import type { NetWorthTickerAnchor } from '@/hooks/useOptions';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '@/i18n';
import { PRICE_WINDOW_OPTIONS } from '@/lib/price-window';
import { clampUiScale, UI_SCALE_OPTIONS } from '@/lib/ui-scale';

/**
 * The choices of the settings selects, shared by the forms and the command palette's settings source so both offer
 * the same options with the same labels. Values are strings, as the selects hold them; numeric settings convert.
 */

/**
 * A fixed label (game terms, names) or an i18n key (namespace-prefixed, so it resolves whatever the caller's `t`), with
 * a count for plural labels.
 */
export type SettingOption = { value: string; label: string } | { value: string; labelKey: string; count?: number };

export function optionLabel(t: TFunction, option: SettingOption): string {
  if ('label' in option) return option.label;
  return option.count === undefined ? t(option.labelKey) : t(option.labelKey, { count: option.count });
}

const keyed = <V extends string>(values: readonly V[], prefix: string) =>
  values.map((value) => ({ value, labelKey: `${prefix}.${value}` }));

/** Preset numbers plus the saved one when it isn't a preset (e.g. one an older version offered). */
const withCurrent = (presets: readonly number[], current: number) =>
  presets.includes(current) ? [...presets] : [...presets, current];

// General: game terms stay in English, as in the game
export const LADDER_OPTIONS: SettingOption[] = [
  { value: 'ladder', label: 'Ladder' },
  { value: 'non-ladder', label: 'Non-Ladder' },
];

export const MODE_OPTIONS: SettingOption[] = [
  { value: 'softcore', label: 'Softcore' },
  { value: 'hardcore', label: 'Hardcore' },
];

// Interface
export const LANGUAGE_OPTIONS: SettingOption[] = [
  { value: 'system', labelKey: 'common:language.system' },
  ...SUPPORTED_LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
];

export const uiScaleOptions = (current: number | undefined): SettingOption[] =>
  withCurrent(UI_SCALE_OPTIONS, clampUiScale(current))
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: `${n}%` }));

/** Ticker positions (net worth ticker, corrupted zone timer). */
export const TICKER_ANCHOR_OPTIONS: { value: NetWorthTickerAnchor; labelKey: string }[] = [
  { value: 'top-left', labelKey: 'settings:tickerAnchor.topLeft' },
  { value: 'top-center', labelKey: 'settings:tickerAnchor.topCenter' },
  { value: 'top-right', labelKey: 'settings:tickerAnchor.topRight' },
  { value: 'bottom-left', labelKey: 'settings:tickerAnchor.bottomLeft' },
  { value: 'bottom-right', labelKey: 'settings:tickerAnchor.bottomRight' },
  { value: 'above-chat', labelKey: 'settings:tickerAnchor.aboveChat' },
  { value: 'custom', labelKey: 'settings:tickerAnchor.custom' },
];

export const ZONE_ALERT_OPTIONS: SettingOption[] = [
  { value: 'off', labelKey: 'settings:interface.zoneAlertOptions.off' },
  { value: 'all', labelKey: 'settings:interface.zoneAlertOptions.all' },
  { value: 'followed', labelKey: 'settings:interface.zoneAlertOptions.followed' },
];

export const TIMER_ZONES_OPTIONS: SettingOption[] = [
  { value: 'all', labelKey: 'settings:interface.timerZonesOptions.all' },
  { value: 'followed', labelKey: 'settings:interface.timerZonesOptions.followed' },
];

export const TIMER_LAYOUT_OPTIONS: SettingOption[] = [
  { value: 'horizontal', labelKey: 'settings:interface.timerLayoutOptions.horizontal' },
  { value: 'vertical', labelKey: 'settings:interface.timerLayoutOptions.vertical' },
];

// Chat
export const CHAT_TIMING_OPTIONS: SettingOption[] = [
  { value: 'in-game', labelKey: 'settings:chat.timing.options.inGame' },
  { value: 'out-of-game', labelKey: 'settings:chat.timing.options.outOfGame' },
  { value: 'both', labelKey: 'settings:chat.timing.options.always' },
  { value: 'never', labelKey: 'settings:chat.timing.options.never' },
];

// Price check
/** Labels stay getters, as in PRICE_WINDOW_OPTIONS, so they follow the UI language. */
export const PRICE_WINDOW_SELECT_OPTIONS: SettingOption[] = PRICE_WINDOW_OPTIONS.map((option) => ({
  value: String(option.hours),
  get label() {
    return option.label;
  },
}));

export const MARGIN_UNIT_OPTIONS: SettingOption[] = [
  { value: 'percent', labelKey: 'settings:stats.marginUnit.percent' },
  { value: 'flat', labelKey: 'settings:stats.marginUnit.flat' },
];

export const CORRUPTED_FILTER_OPTIONS: SettingOption[] = [
  { value: 'both', labelKey: 'settings:stats.corruptedFilter.both' },
  { value: 'corrupted', labelKey: 'settings:stats.corruptedFilter.corrupted' },
  { value: 'non-corrupted', labelKey: 'settings:stats.corruptedFilter.nonCorrupted' },
];

export const RANK_DISPLAY_OPTIONS: SettingOption[] = [
  { value: 'bar', labelKey: 'settings:stats.rankDisplay.bar' },
  { value: 'blocks', labelKey: 'settings:stats.rankDisplay.blocks' },
];

// Net worth
export const AUTO_SNAPSHOT_OPTIONS: SettingOption[] = [
  { value: '0', labelKey: 'settings:networth.autoSnapshotOptions.off' },
  { value: '5', labelKey: 'settings:networth.autoSnapshotOptions.every5' },
  { value: '10', labelKey: 'settings:networth.autoSnapshotOptions.every10' },
  { value: '15', labelKey: 'settings:networth.autoSnapshotOptions.every15' },
  { value: '30', labelKey: 'settings:networth.autoSnapshotOptions.every30' },
];

// Market
export const AUTO_DELIST_VALUES = ['off', 'ask', 'auto'] as const;
export const LISTINGS_VIEW_VALUES = ['cards', 'rows'] as const;
export const SORT_VALUES = ['newest', 'cheapest', 'priciest'] as const;
export const SELLER_VALUES = ['all', 'online', 'in-game'] as const;
export const BUYOUT_VALUES = ['any', 'yes', 'no'] as const;
export const PAGE_SIZES = [25, 50, 100] as const;
/** The market filter sidebar's listing age choices. */
const AGE_DAYS = [1, 3, 7, 14, 30, 90] as const;
const ALERT_SECONDS = [5, 8, 15, 30] as const;

export const AUTO_DELIST_OPTIONS: SettingOption[] = keyed(
  AUTO_DELIST_VALUES,
  'settings:market.listings.autoDelist.options',
);
export const LISTINGS_VIEW_OPTIONS: SettingOption[] = keyed(
  LISTINGS_VIEW_VALUES,
  'settings:market.listings.view.options',
);
export const SORT_OPTIONS: SettingOption[] = keyed(SORT_VALUES, 'settings:market.browser.sort.options');
export const SELLER_OPTIONS: SettingOption[] = keyed(SELLER_VALUES, 'settings:market.browser.seller.options');
export const BUYOUT_OPTIONS: SettingOption[] = keyed(BUYOUT_VALUES, 'settings:market.browser.buyout.options');
export const PAGE_SIZE_OPTIONS: SettingOption[] = PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }));

export const ageDayOptions = (current: number): SettingOption[] =>
  withCurrent(AGE_DAYS, current).map((n) => ({ value: String(n), labelKey: 'market:filters.days', count: n }));

export const alertSecondsOptions = (current: number): SettingOption[] =>
  withCurrent(ALERT_SECONDS, current).map((n) => ({
    value: String(n),
    labelKey: 'settings:market.alerts.duration.seconds',
    count: n,
  }));
