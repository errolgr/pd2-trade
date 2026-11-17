/**
 * What a buy request's result card (and row) shows on the Wanted source: title, kind, pills, what it pays, what it
 * wants line by line (matched against the user's stash item when one fits), the owner's status. Pure: no React.
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
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
