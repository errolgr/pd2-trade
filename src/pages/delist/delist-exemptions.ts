import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { DelistExceptionMode, ISettings } from '@/hooks/useOptions';
import type { StashRemovals } from './stash-removal';

/** An item base the auto-delist never asks about: its name as shown, and the base codes it stands for. */
export interface DelistException {
  name: string;
  codes: string[];
}

/**
 * Stackable currency, by base code (the site's Type/Base catalog, pages/market/lib/catalog.data.ts): Token of
 * Absolution, Larzuk's Puzzlebox and Puzzlepiece, the uber keys (Terror, Hate, Destruction) and the four
 * essences. Players move these out of the currency tab to list them and back in, so leaving the stash says
 * little about a sale.
 */
export const STACKABLE_CURRENCY_CODES: Readonly<Record<string, true>> = {
  toa: true,
  lbox: true,
  lpp: true,
  pk1: true,
  pk2: true,
  pk3: true,
  tes: true,
  ceh: true,
  bet: true,
  fed: true,
};

/** Most per-listing exemptions kept (oldest dropped first): more than every listing of all four modes. */
export const EXEMPT_LISTINGS_MAX = 200;

/** What keeps a listing out of the auto-delist (Settings → Market, and the Quick List form). */
export interface DelistExemptions {
  /** Listing ids exempted one by one: they apply in every mode. */
  listingIds: readonly string[];
  /** The picked items; they apply unless the mode is 'none'. */
  exceptions: readonly DelistException[];
  mode: DelistExceptionMode;
}

type ExemptionSettings = Pick<ISettings, 'delistExemptListings' | 'delistExceptions' | 'delistExceptionMode'>;

type BaseFields = { base_code?: string | null; base?: { id?: unknown; name?: unknown } | null };

export function exemptionsOf(settings: ExemptionSettings): DelistExemptions {
  return {
    listingIds: settings.delistExemptListings ?? [],
    exceptions: settings.delistExceptions ?? [],
    mode: settings.delistExceptionMode ?? 'none',
  };
}

/** The item's base code (`base_code`, else `base.id`); null when it has neither. */
export function baseCodeOf(item: BaseFields): string | null {
  if (item.base_code) return item.base_code;
  return typeof item.base?.id === 'string' && item.base.id ? item.base.id : null;
}

/** The exception an item's base makes ("Never ask for Token of Absolution"); null without a base code. */
export function exceptionOf(item: BaseFields): DelistException | null {
  const code = baseCodeOf(item);
  if (!code) return null;
  const name = typeof item.base?.name === 'string' && item.base.name ? item.base.name : code;
  return { name, codes: [code] };
}

export const isStackableCurrency = (code: string | null): boolean => !!code && STACKABLE_CURRENCY_CODES[code] === true;

/** Whether the exception list covers a base code (whatever the mode). */
export const isExcepted = (code: string | null, exceptions: readonly DelistException[]): boolean =>
  !!code && exceptions.some((exception) => exception.codes.includes(code));

/**
 * Whether the item's base is left alone under the mode: 'stackable' skips stackable currency and the picked items,
 * 'selected' only the picked items, 'none' nothing.
 */
export function isBaseExempt(item: BaseFields, { mode, exceptions }: DelistExemptions): boolean {
  if (mode === 'none') return false;
  const code = baseCodeOf(item);
  return (mode === 'stackable' && isStackableCurrency(code)) || isExcepted(code, exceptions);
}

export function isDelistExempt(
  listing: Pick<MarketListingEntry, '_id'> & { item: BaseFields },
  exemptions: DelistExemptions,
): boolean {
  return exemptions.listingIds.includes(listing._id) || isBaseExempt(listing.item, exemptions);
}

/**
 * The removals without exempt listings: a look-alike group loses its exempt listings (at most as many as are
 * left can have gone) and is dropped once none is left.
 */
export function withoutExempt(removals: StashRemovals, exemptions: DelistExemptions): StashRemovals {
  const keep = (listing: MarketListingEntry) => !isDelistExempt(listing, exemptions);
  const ambiguous: StashRemovals['ambiguous'] = [];
  for (const group of removals.ambiguous) {
    const listings = group.listings.filter(keep);
    if (listings.length > 0) ambiguous.push({ listings, count: Math.min(group.count, listings.length) });
  }
  return { removed: removals.removed.filter(keep), ambiguous };
}

/** The list with `exception` added: an entry of the same name takes its codes. */
export function addDelistException(
  exceptions: readonly DelistException[],
  exception: DelistException,
): DelistException[] {
  const same = exceptions.find((entry) => entry.name === exception.name);
  if (!same) return [...exceptions, { name: exception.name, codes: [...new Set(exception.codes)] }];
  const codes = [...new Set([...same.codes, ...exception.codes])];
  return exceptions.map((entry) => (entry === same ? { ...entry, codes } : entry));
}

/** The list without every entry covering one of `codes`. */
export function removeDelistException(exceptions: readonly DelistException[], codes: readonly string[]): DelistException[] {
  return exceptions.filter((entry) => !entry.codes.some((code) => codes.includes(code)));
}

/**
 * The settings change that leaves `exception` alone from now on ("Never ask for …", "Remember for all …"): it joins
 * the picked items, and the mode goes from 'none' to 'selected' so that it takes effect.
 */
export function rememberException(
  settings: Pick<ISettings, 'delistExceptions' | 'delistExceptionMode'>,
  exception: DelistException,
): Pick<ISettings, 'delistExceptions' | 'delistExceptionMode'> {
  const delistExceptions = addDelistException(settings.delistExceptions ?? [], exception);
  return (settings.delistExceptionMode ?? 'none') === 'none'
    ? { delistExceptions, delistExceptionMode: 'selected' }
    : { delistExceptions };
}

/** The exempt listing ids with `listingId` in or out; newest last, at most EXEMPT_LISTINGS_MAX. */
export function setListingExempt(ids: readonly string[], listingId: string, exempt: boolean): string[] {
  const rest = ids.filter((id) => id !== listingId);
  return exempt ? [...rest, listingId].slice(-EXEMPT_LISTINGS_MAX) : rest;
}

/** The Quick List form's choices: `undefined` leaves that part as it is. */
export interface DelistChoice {
  /** "Don't auto-delist this listing". */
  skip?: boolean;
  /** "Remember for all {{name}}": the item's base in (or out of) the picked items. */
  remember?: boolean;
}

/** The settings change a listing's Quick List choices make; null when nothing changes. */
export function delistChoiceUpdate(
  settings: ExemptionSettings,
  listingId: string,
  item: BaseFields,
  { skip, remember }: DelistChoice,
): ExemptionSettings | null {
  const update: ExemptionSettings = {};
  const ids = settings.delistExemptListings ?? [];
  if (skip !== undefined && ids.includes(listingId) !== skip) {
    update.delistExemptListings = setListingExempt(ids, listingId, skip);
  }
  const exception = remember === undefined ? null : exceptionOf(item);
  if (exception) {
    const exceptions = settings.delistExceptions ?? [];
    const listed = isExcepted(exception.codes[0], exceptions);
    // Under 'none' the list is dormant: remembering turns it on, and not remembering leaves it as it is
    const active = (settings.delistExceptionMode ?? 'none') !== 'none';
    if (remember && !(listed && active)) Object.assign(update, rememberException(settings, exception));
    else if (!remember && listed && active) update.delistExceptions = removeDelistException(exceptions, exception.codes);
  }
  return Object.keys(update).length > 0 ? update : null;
}
