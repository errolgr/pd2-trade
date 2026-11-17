/**
 * Responses to buy requests (contract "Responses (v4)"): what a contact sends as the seller's item, the buyer's
 * notification for a `wtb.response` event, and the order the Responses list shows them in. Pure: no React.
 */
import { t } from '@/i18n';
import { type CustomToastPayload, ToastActionType } from '@/common/types/Events';
import { formatStat } from '../components/stat-text';
import type { WtbContactItem, WtbPatch } from '../alerts/wtb-api';
import { formatOffer, type WtbResponse } from '../lib/wtb';
import type { MarketPanelPayload } from '../lib/types';
import type { WtbSelection } from './WtbRequestDrawer';

/**
 * The item a contact from a request's drawer / card sends: the user's fitting stash item, the listing it was opened
 * from, or the price-checked item; none from a board card without one.
 */
export function selectionContactItem(
  selection: Pick<WtbSelection, 'stashItem' | 'listingItem' | 'itemText'>,
): WtbContactItem | null {
  if (selection.stashItem) return { item: selection.stashItem };
  if (selection.listingItem) return { item: selection.listingItem };
  if (selection.itemText) return { text: selection.itemText };
  return null;
}

/** "✓ +20 Faster Cast Rate (25) · ✓ +1 to All Skills": the request rows the item meets, with its values. */
export function responseMetLine(response: Pick<WtbResponse, 'met'>): string {
  return response.met
    .filter((row) => row.met)
    .map((row) => `✓ ${row.value !== null ? `${row.label} (${formatStat(row.value)})` : row.label}`)
    .join(' · ');
}

/** The Responses list: the ones with an item first, newest first within each; dismissed ones left out. */
export function sortResponses(responses: readonly WtbResponse[]): WtbResponse[] {
  return responses
    .filter((r) => !r.dismissed)
    .sort((a, b) => Number(!!b.item) - Number(!!a.item) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** The buyer's toast / notification log entry for a response. */
export interface WtbResponseNotice {
  title: string;
  body: string;
  /** The seller's item ("Grim Visage"), none for a plain whisper. */
  itemName: string | null;
  metLine: string;
}

export function responseNotice(response: WtbResponse): WtbResponseNotice {
  const seller = response.seller.name;
  const title = response.request.title;
  return {
    title: t('market:wtb.response.title'),
    body: response.item
      ? t('market:wtb.response.body', { seller, title, offer: formatOffer(response.request.offer) })
      : t('market:wtb.response.bodyNoItem', { seller, title }),
    itemName: response.item?.name ?? null,
    metLine: response.item ? responseMetLine(response) : '',
  };
}

/** Mark filled: closes the request, recording the response that filled it. */
export const markFilledPatch = (response: Pick<WtbResponse, 'id'>): WtbPatch => ({
  status: 'closed',
  filledByResponseId: response.id,
});

/**
 * The buyer's toast (and notification log entry) for a response: the notice, the item's picture, View request
 * (the request's drawer: also the log row's action) and Whisper back (also a button of the log row).
 */
export function wtbResponseToast(response: WtbResponse, durationMs: number): CustomToastPayload {
  const notice = responseNotice(response);
  return {
    title: notice.title,
    description: [notice.body, notice.itemName, notice.metLine].filter(Boolean).join('\n'),
    duration: durationMs,
    action: {
      label: t('market:wtb.response.viewRequest'),
      type: ToastActionType.OPEN_MARKET_PANEL,
      data: { requestId: response.requestId } satisfies MarketPanelPayload,
    },
    secondaryAction: {
      label: t('market:wtb.response.whisperBack'),
      type: ToastActionType.WTB_WHISPER_BACK,
      data: response,
    },
    ...(response.item && { art: { itemName: response.item.name, baseCode: response.item.baseCode ?? undefined } }),
  };
}
