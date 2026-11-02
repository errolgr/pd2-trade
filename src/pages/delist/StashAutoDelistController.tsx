import React, { useEffect, useRef } from 'react';
import {
  AccountMismatchError,
  AuthenticationError,
  isExpectedApiError,
  NoAccountSelectedError,
  usePd2Website,
} from '@/hooks/pd2website/usePD2Website';
import { isListingDeleted } from '@/hooks/pd2website/listing-events';
import { useOptions } from '@/hooks/useOptions';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { confirmToast, showToast, useOverlay } from '@/overlay';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { itemDisplayName } from '@/pages/market/lib/listing';
import { isDiabloFocused } from '@/lib/diablo-focus';
import { isNetworkError } from '@/lib/network-errors';
import { t } from '@/i18n';
import { TRADE_LISTINGS_LIMIT } from './trade-match';
import {
  detectStashRemovals,
  droppedFingerprints,
  snapshotStash,
  stashSize,
  type StashSnapshot,
} from './stash-removal';

/** How often the stash is compared with the last look, while Diablo is focused. */
export const STASH_POLL_MS = 60_000;
/** How long the user's listing list counts as known for "anything listed at all?" (re-read before acting). */
export const LISTINGS_TTL_MS = 5 * 60_000;
/** How long an ask-first prompt stays up. */
const PROMPT_MS = 20_000;

/**
 * Delists a listing once its item leaves the stash (renders nothing). Settings → Account → Marketplace: off, ask
 * first (a toast to confirm), or delist right away (a toast says so). Each minute while the game is focused it
 * reads the stash and compares it with the last read: a move between tabs is no removal, and when look-alike
 * items make it unclear which one left, the user picks the listing in any mode.
 */
const StashAutoDelistController: React.FC = () => {
  const { settings } = useOptions();
  const { authData, fetchStash, getMarketListings, deleteMarketListing } = usePd2Website();
  const { openPanel } = useOverlay();
  const mode = settings.stashAutoDelist ?? 'ask';
  const enabled = mode !== 'off';
  const userId = authData?.user?._id;
  const account = settings.account?.trim();
  const hardcore = settings.mode === 'hardcore';
  const ladder = settings.ladder === 'ladder';

  // Read when a tick runs: switching ask ↔ auto, or a refreshed token, keeps the last stash read
  const latest = useRef({ mode, fetchStash, getMarketListings, deleteMarketListing, openPanel });
  latest.current = { mode, fetchStash, getMarketListings, deleteMarketListing, openPanel };

  useEffect(() => {
    if (!enabled || !userId || !account) return;
    let baseline: StashSnapshot | null = null;
    let listings: { at: number; data: MarketListingEntry[] } | null = null;
    let running = false;
    let stopped = false;

    const ownListings = async (): Promise<MarketListingEntry[]> => {
      const result = await latest.current.getMarketListings(
        buildGetAllUserMarketListingsQuery(userId, hardcore, ladder, TRADE_LISTINGS_LIMIT, 0),
      );
      // Another game account's items never were in this stash; a listing deleted already is gone whatever PD2 says
      const data = result.data.filter(
        (listing) =>
          !isListingDeleted(listing._id) &&
          (!listing.item.account_id || listing.item.account_id.toLowerCase() === account.toLowerCase()),
      );
      listings = { at: Date.now(), data };
      return data;
    };

    const remove = async (listing: MarketListingEntry, name: string) => {
      try {
        await latest.current.deleteMarketListing(listing._id);
        showToast({ title: t('quickList:autoDelist.title'), description: t('quickList:autoDelist.removed', { name }) });
      } catch (err) {
        console.warn('[StashAutoDelist] Delete failed:', err);
        showToast({
          title: t('quickList:autoDelist.title'),
          description: t('quickList:autoDelist.removeFailed', { name }),
          variant: 'error',
        });
      }
    };

    const ask = (listing: MarketListingEntry, description: string, name: string) =>
      confirmToast({
        title: t('quickList:autoDelist.title'),
        description,
        confirmLabel: t('quickList:autoDelist.delist'),
        cancelLabel: t('quickList:autoDelist.keep'),
        duration: PROMPT_MS,
        onConfirm: () => remove(listing, name),
      });

    const tick = async () => {
      if (running) return;
      running = true;
      try {
        if (!(await isDiabloFocused())) return;
        const known = listings && Date.now() - listings.at < LISTINGS_TTL_MS ? listings.data : await ownListings();
        if (known.length === 0) return;
        const snapshot = snapshotStash((await latest.current.fetchStash()).items ?? []);
        if (stopped) return;
        const prev = baseline;
        // An empty stash right after a full one is PD2 answering badly, not everything taken out
        if (prev && stashSize(snapshot) === 0 && stashSize(prev) > 0) return;
        baseline = snapshot;
        if (!prev || droppedFingerprints(prev, snapshot).length === 0) return;

        // Fresh: a listing sold or removed since the last look is left alone
        const current = await ownListings();
        if (stopped) return;
        const { removed, ambiguous } = detectStashRemovals(prev, snapshot, current);
        const { mode: action, openPanel: open } = latest.current;
        for (const listing of removed) {
          const name = itemDisplayName(listing.item);
          if (action === 'auto') await remove(listing, name);
          else ask(listing, t('quickList:autoDelist.confirm', { name }), name);
        }
        for (const group of ambiguous) {
          const name = itemDisplayName(group.listings[0].item);
          if (group.listings.length === 1) {
            ask(group.listings[0], t('quickList:autoDelist.confirmLookAlike', { name }), name);
            continue;
          }
          confirmToast({
            title: t('quickList:autoDelist.title'),
            description: t('quickList:autoDelist.pick', { name }),
            confirmLabel: t('quickList:autoDelist.choose'),
            cancelLabel: t('quickList:autoDelist.keep'),
            duration: PROMPT_MS,
            onConfirm: () => open('delist', { listings: group.listings }),
          });
        }
      } catch (err) {
        const expected =
          err instanceof AuthenticationError ||
          err instanceof NoAccountSelectedError ||
          err instanceof AccountMismatchError ||
          isExpectedApiError(err) ||
          isNetworkError(err);
        if (expected) console.warn('[StashAutoDelist] Stash check skipped:', err);
        else console.error('[StashAutoDelist] Stash check failed:', err);
      } finally {
        running = false;
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), STASH_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, userId, account, hardcore, ladder]);

  return null;
};

export default StashAutoDelistController;
