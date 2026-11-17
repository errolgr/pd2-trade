/**
 * Demand next to the listings, purely informational (no outbidding, no ranking): the bar over Live and Sold
 * results ("{n} players are buying this"), and the post drawer's "Others want this too". Pure: no React.
 */
import { ageText } from '../lib/listing';
import type { MarketPriceStats } from '../lib/price-stats';
import { roundHr } from '../lib/price-stats';
import type { MarketFilters } from '../lib/types';
import {
  formatOffer,
  wtbExpired,
  wtbItemScoped,
  wtbOverlapBody,
  wtbStatRows,
  type WtbRequest,
  type WtbSearchBody,
} from '../lib/wtb';
import type { WtbSearchPage } from '../alerts/wtb-api';
import { statRowText } from './wtb-text';

/** Offers the live bar names. */
export const DEMAND_TOP_OFFERS = 3;
/** Requests the Sold archive's offer range and Live's "including yours" read (the search's page limit). */
export const MAX_DEMAND_RANGE = 50;
/** Overlapping requests the post drawer asks for (the user's own are left out, the box shows three). */
export const OTHERS_LOOKUP = 10;

/**
 * The overlap searches behind the demand bar for the search that ran (`ran`): the best offers (Live) or the whole
 * range (Sold), and on Live the signed-in user's own (for "including yours"); null for a search that names no item
 * (stats alone are anything's demand) or on the Wanted source.
 */
export function demandBodies(
  ran: MarketFilters | null,
  signedIn: boolean,
): { body: WtbSearchBody; mineBody: WtbSearchBody | null } | null {
  if (!ran || ran.source === 'wanted' || !wtbItemScoped(ran)) return null;
  return {
    body: wtbOverlapBody(ran, { limit: ran.source === 'archive' ? MAX_DEMAND_RANGE : DEMAND_TOP_OFFERS }),
    mineBody: ran.source === 'live' && signedIn ? wtbOverlapBody(ran, { limit: MAX_DEMAND_RANGE, mine: true }) : null,
  };
}

/** The post drawer's "Others want this too" search: requests overlapping the draft's item (none without one). */
export const othersOverlapBody = (filters: MarketFilters): WtbSearchBody | null =>
  wtbItemScoped(filters) ? wtbOverlapBody(filters, { limit: OTHERS_LOOKUP }) : null;
export type DemandBarModel =
  | {
      kind: 'live';
      /** Open requests that could take what the search finds. */
      count: number;
      /** The best offers, best first ("2 HR", "1 Ber"), at most DEMAND_TOP_OFFERS. */
      topOffers: string[];
      /** The user has one of them open. */
      includesYours: boolean;
    }
  | {
      kind: 'archive';
      count: number;
      /** What it sold for lately (p25–p75 HR of the archive search), null without sales. */
      sold: { low: number; high: number; count: number } | null;
      /** The open offers' HR range (offers without an HR value left out), null when none has one. */
      offers: { low: number; high: number } | null;
    };

/**
 * The bar over Live / Sold archive results for the overlap search's page (null: not loaded or failed); null when
 * nobody is buying (the bar doesn't show). `mine`: the user's own overlapping requests (every status).
 */
export function demandBarModel(
  source: MarketFilters['source'],
  page: WtbSearchPage | null,
  { mine, priceStats, now }: { mine: readonly WtbRequest[] | null; priceStats: MarketPriceStats | null; now: number },
): DemandBarModel | null {
  if (!page || page.total < 1 || source === 'wanted') return null;
  if (source === 'live') {
    return {
      kind: 'live',
      count: page.total,
      topOffers: page.items.slice(0, DEMAND_TOP_OFFERS).map((r) => formatOffer(r.offer)),
      includesYours: (mine ?? []).some((r) => r.status === 'open' && !wtbExpired(r, now)),
    };
  }
  const hrs = page.items.flatMap((r) => (r.offer.hr !== null && r.offer.hr > 0 ? [r.offer.hr] : []));
  return {
    kind: 'archive',
    count: page.total,
    sold:
      priceStats && priceStats.count > 0 && priceStats.p25 !== null && priceStats.p75 !== null
        ? { low: roundHr(priceStats.p25), high: roundHr(priceStats.p75), count: priceStats.count }
        : null,
    offers: hrs.length ? { low: roundHr(Math.min(...hrs)), high: roundHr(Math.max(...hrs)) } : null,
  };
}

/**
 * How another request differs from the one being posted: the same stat rows, or its first different row and how
 * many more differ.
 */
export type OthersDifference = { kind: 'same' } | { kind: 'row'; text: string; more: number };

/** One row of "Others want this too": opens that request on the Wanted source. */
export interface OthersRow {
  request: WtbRequest;
  buyer: string;
  /** Since its last bump, as a listing's age ("3h"). */
  age: string;
  difference: OthersDifference;
  offer: string;
}

/** The box: other users' requests overlapping the draft (`count`), the best OTHERS_ROWS of them. */
export interface OthersBox {
  count: number;
  rows: OthersRow[];
}

/** Rows the post drawer's box shows. */
export const OTHERS_ROWS = 3;

/** The stat rows of `other` the draft doesn't ask for alike (another key, or other bounds): the first and the rest. */
export function requestDifference(
  other: Pick<WtbRequest, 'filters'>,
  draft: Pick<MarketFilters, 'stats'>,
): OthersDifference {
  const mine = new Map(wtbStatRows(draft).map((s) => [`${s.kind}:${s.key}`, s]));
  const differing = wtbStatRows(other.filters).filter((row) => {
    const same = mine.get(`${row.kind}:${row.key}`);
    return !same || same.min !== row.min || same.max !== row.max || !!same.not !== !!row.not;
  });
  return differing.length === 0
    ? { kind: 'same' }
    : { kind: 'row', text: statRowText(differing[0]), more: differing.length - 1 };
}

/**
 * "Others want this too" for the drawer's overlap page: other users' requests only (never the user's own, so
 * never the one being edited), at most OTHERS_ROWS, best offer first, and how many there are; null when none.
 */
export function othersBoxModel(
  page: WtbSearchPage | null,
  draft: Pick<MarketFilters, 'stats'>,
  { userId, editingId, now }: { userId: string | null; editingId: string | null; now: number },
): OthersBox | null {
  const items = page?.items ?? [];
  const others = items.filter((r) => r.id !== editingId && (!userId || r.buyer.userId !== userId));
  if (others.length === 0 || !page) return null;
  return {
    // The total counts the user's own too: take out the ones this page shows
    count: Math.max(others.length, page.total - (items.length - others.length)),
    rows: others.slice(0, OTHERS_ROWS).map((r) => ({
      request: r,
      buyer: r.buyer.name,
      age: ageText(Date.parse(r.bumpedAt || r.createdAt), now),
      difference: requestDifference(r, draft),
      offer: formatOffer(r.offer),
    })),
  };
}
