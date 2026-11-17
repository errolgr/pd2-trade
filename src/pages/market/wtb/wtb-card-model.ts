/**
 * What a buy request's result card (and row) shows on the Wanted source: title, kind, pills, what it pays, what it
 * wants line by line (matched against the user's stash item when one fits), the owner's status. Pure: no React.
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { t as translate } from '@/i18n';
import type { MarketFilters } from '../lib/types';
import { itemNameOption } from '../lib/catalog';
import { groupOf } from '../lib/stat-groups';
import { baseValueLabel, pickedBases, typeValueLabel } from '../lib/type-selection';
import {
  formatOffer,
  listPriceFor,
  wtbDaysLeft,
  wtbExpired,
  wtbExpiringSoon,
  wtbStatRows,
  type WtbListPrice,
  type WtbRequest,
} from '../lib/wtb';
import { itemRowValue, summaryRowText, wtbTitleColor } from './wtb-text';
import { ownerActionsFor, wtbTimes, type OwnerActionSet, type WtbTimes } from './wtb-bump';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';

/** A request's item pills, as a listing card shows its item's (see ItemPills). */
export interface WtbCardPills {
  /** The quality it asks for (its named item's, else its one rarity). */
  quality: string | null;
  qualityColor: string;
  /** "3os", "2+os", "2–4os". */
  sockets: string | null;
  corrupted: boolean;
  ethereal: boolean;
  /** The flags it asks for beyond the Corrupted / Ethereal pills: Uncorrupted, Non-ethereal, (Not) desecrated, … */
  flags: WtbFlag[];
}

export type WtbFlagName = 'corrupted' | 'ethereal' | 'desecrated' | 'identified';

/** An item flag a request pins to yes or no, with its word ("Uncorrupted"). */
export interface WtbFlag {
  flag: WtbFlagName;
  value: 'yes' | 'no';
  text: string;
}

const FLAG_TEXT: Record<WtbFlagName, Record<'yes' | 'no', () => string>> = {
  corrupted: {
    yes: () => translate('market:wtb.flags.corrupted.yes'),
    no: () => translate('market:wtb.flags.corrupted.no'),
  },
  ethereal: {
    yes: () => translate('market:wtb.flags.ethereal.yes'),
    no: () => translate('market:wtb.flags.ethereal.no'),
  },
  desecrated: {
    yes: () => translate('market:wtb.flags.desecrated.yes'),
    no: () => translate('market:wtb.flags.desecrated.no'),
  },
  identified: {
    yes: () => translate('market:wtb.flags.identified.yes'),
    no: () => translate('market:wtb.flags.identified.no'),
  },
};
const FLAG_NAMES: readonly WtbFlagName[] = ['corrupted', 'ethereal', 'desecrated', 'identified'];

/** The flags `f` pins to yes or no, in order: corrupted, ethereal, desecrated, identified. */
export function wtbFlags(f: Pick<MarketFilters, WtbFlagName>): WtbFlag[] {
  return FLAG_NAMES.flatMap((flag) => {
    const value = f[flag];
    return value === 'yes' || value === 'no' ? [{ flag, value, text: FLAG_TEXT[flag][value]() }] : [];
  });
}

/** "1 socket", "3+ sockets", "≤4 sockets", "2–4 sockets"; null when it asks none. */
export function wtbSocketsText(f: Pick<MarketFilters, 'socketsMin' | 'socketsMax'>): string | null {
  const { socketsMin: min, socketsMax: max } = f;
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined)
    return min === max
      ? translate('market:wtb.sockets.exact', { count: min })
      : translate('market:wtb.sockets.range', { min, count: max });
  return min !== undefined
    ? translate('market:wtb.sockets.min', { count: min })
    : translate('market:wtb.sockets.max', { count: max });
}

/** What a request asks of the item itself (the drawers' summary): its pinned flags, then its sockets. */
export interface WtbRequirements {
  flags: WtbFlag[];
  sockets: string | null;
}

export function wtbRequirements(f: Pick<MarketFilters, WtbFlagName | 'socketsMin' | 'socketsMax'>): WtbRequirements {
  return { flags: wtbFlags(f), sockets: wtbSocketsText(f) };
}

/** One stat row the request asks for. */
export interface WtbWantLine {
  id: string;
  text: string;
  corruption: boolean;
  nice: boolean;
  /** The user's fitting stash item meets it. */
  matched: boolean;
  /** That item's value for the row, when matched and readable. */
  value: number | null;
}

export type WtbCardStatus = 'live' | 'soon' | 'paused' | 'expired' | 'closed';

export interface WtbCardModel {
  title: string;
  titleColor: string;
  /** The base or type it asks for ("Circlet"), for the "Buy request · …" subtitle; null for none. */
  kind: string | null;
  /** The listing card's item pills, for what the request asks. */
  pills: WtbCardPills;
  /** "2 HR", "1 Ber". */
  offer: string;
  /** The offer in HR when it is in runes and its HR value is known. */
  approxHr: number | null;
  openToOffers: boolean;
  /** The user's own request: status and owner actions instead of contacting. */
  own: boolean;
  status: WtbCardStatus;
  daysLeft: number;
  /** A stash item of the user's fits it. */
  fits: boolean;
  wants: WtbWantLine[];
  /** What "List at {offer}" lists the fitting item at; null without one. */
  listPrice: WtbListPrice | null;
  /** The owner's actions (Bump, Edit, Pause / Resume, Close); null on others' requests. */
  actions: OwnerActionSet | null;
  /** "bumped 3h · posted 2d", and how long ago it expired. */
  times: WtbTimes;
}

const socketsText = (min: number | undefined, max: number | undefined): string | null => {
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined) return min === max ? `${min}os` : `${min}–${max}os`;
  return min !== undefined ? `${min}+os` : `≤${max}os`;
};

/** The quality a request names: its item's (unique, set, runeword), else its one rarity. */
function requestQuality(request: WtbRequest): string | null {
  const f = request.filters;
  const named = f.itemName ? itemNameOption(f.itemName)?.quality : undefined;
  if (named && named !== 'Base') return named;
  return f.rarity?.length === 1 ? f.rarity[0] : null;
}

/** The status pill of a request: closed, expired, paused, its last day, or live. */
export function wtbCardStatus(request: WtbRequest, now: number): WtbCardStatus {
  if (request.status === 'closed') return 'closed';
  if (wtbExpired(request, now)) return 'expired';
  if (request.status === 'paused') return 'paused';
  return wtbExpiringSoon(request, now) ? 'soon' : 'live';
}

/**
 * The card of `request` for the user `userId` (null: signed out); `fit`: the user's stash item it fits and which of
 * its nice-to-have rows that item meets (Fits my stash).
 */
export function buildWtbCardModel(
  request: WtbRequest,
  {
    userId,
    fit,
    now,
  }: { userId: string | null; fit?: { item: GameStashItem; niceToHave: { id: string; met: boolean }[] }; now: number },
): WtbCardModel {
  const f = request.filters;
  const own = !!userId && request.buyer.userId === userId;
  const quality = requestQuality(request);
  const niceMet = new Map((fit?.niceToHave ?? []).map((n) => [n.id, n.met]));
  const wants = wtbStatRows(f).map((row): WtbWantLine => {
    const nice = request.niceToHaveIds.includes(row.id);
    // A fitting item meets every required row; optional ones as `/match` said
    const matched = !!fit && (nice ? niceMet.get(row.id) === true : groupOf(row) === 'and');
    return {
      id: row.id,
      text: summaryRowText(row),
      corruption: row.kind === 'corruption',
      nice,
      matched,
      value: matched && fit ? itemRowValue(fit.item, row) : null,
    };
  });
  const kind = f.itemName ? null : ((pickedBases(f) ? undefined : baseValueLabel(f)) ?? typeValueLabel(f) ?? null);
  return {
    title: request.title,
    titleColor: wtbTitleColor(f),
    kind,
    pills: {
      quality,
      qualityColor: quality === 'Runeword' ? 'text-q-rune' : qualityColor(quality ?? ''),
      sockets: socketsText(f.socketsMin, f.socketsMax),
      corrupted: f.corrupted === 'yes',
      ethereal: f.ethereal === 'yes',
      // Corrupted and Ethereal (yes) have their own pills
      flags: wtbFlags(f).filter((x) => x.value === 'no' || (x.flag !== 'corrupted' && x.flag !== 'ethereal')),
    },
    offer: formatOffer(request.offer),
    approxHr: request.offer.currency !== 'HR' && request.offer.hr !== null ? request.offer.hr : null,
    openToOffers: request.openToOffers,
    own,
    status: wtbCardStatus(request, now),
    daysLeft: wtbDaysLeft(request, now),
    fits: !!fit,
    wants,
    listPrice: fit && !own ? listPriceFor(request.offer) : null,
    actions: own ? ownerActionsFor(request, now) : null,
    times: wtbTimes(request, now),
  };
}
