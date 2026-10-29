import { showToast, useOverlay } from '@/overlay';
import { openUrl } from '@/lib/browser-opener';
import { writeText } from '@/lib/browser-clipboard';
import { useChatTemplates } from '@/hooks/useChatTemplates';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { fillTemplate, templatePlaceholders, type ChatTemplate } from '@/lib/message-templates';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { verifyListing } from '../lib/freshness';
import { itemDisplayName, listingUrl, sellerAccount } from '../lib/listing';
import { buildWhisper } from '../lib/whisper';
import { t } from '@/i18n';

export interface ListingActions {
  /** Copies `/w *account …` (default wording, or `template` in buildWhisper's tokens) and toasts. */
  copyWhisper: (template?: string) => Promise<void>;
  /**
   * Re-checks the listing on PD2 before acting on it. Resolves the listing to act on (PD2's current copy, so a
   * whisper quotes the current price), or null when it's gone (toasted).
   */
  ensureFresh: () => Promise<MarketListingEntry | null>;
  /** Chat panel: the seller's thread with a listing link drafted. */
  openDm: () => void;
  /** Chat panel: the seller's thread with their Trader sidebar open (no draft). */
  openTrader: () => void;
  openWebsite: () => void;
  /** The user's chat templates usable as a whisper (no custom placeholders), tokens mapped to buildWhisper's. */
  whisperTemplates: ChatTemplate[];
}

/** Opens the chat panel on the listing's seller with their Trader sidebar showing. */
export function useOpenTrader(listing: MarketListingEntry): () => void {
  const { openPanel } = useOverlay();
  return () =>
    openPanel(
      'chat',
      {
        userId: listing.user_id,
        userName: listing.user?.username ?? (sellerAccount(listing) || undefined),
        trader: true,
      },
      { focus: true },
    );
}

/** Whisper / message / website actions shared by the detail pane and the result cards. */
export function useListingActions(listing: MarketListingEntry): ListingActions {
  const { openPanel } = useOverlay();
  const { templates } = useChatTemplates();
  const { marketApi } = usePd2Website();
  const openTrader = useOpenTrader(listing);
  // buildWhisper falls back to the website username, as the price check does
  const account = sellerAccount(listing) || listing.user?.username || null;
  const displayName = itemDisplayName(listing.item);

  const ensureFresh = async (): Promise<MarketListingEntry | null> => {
    const check = await verifyListing(marketApi, listing);
    if (check.status === 'unknown') return listing;
    if (check.status === 'gone') {
      showToast({
        title: t('market:actions.goneTitle'),
        description: t('market:actions.goneDescription', { item: displayName }),
        variant: 'warning',
      });
      return null;
    }
    // PD2's copy may lack what the search row resolved (seller); keep ours for anything it doesn't carry
    return { ...listing, ...check.listing, user: check.listing.user ?? listing.user };
  };

  return {
    whisperTemplates: templates
      .filter((tpl) => templatePlaceholders(tpl.text).length === 0)
      .map((tpl) => ({
        ...tpl,
        // buildWhisper fills (and sanitizes) the listing values
        text: fillTemplate(tpl.text, {
          itemName: '{item}',
          price: '{price}',
          accountName: '{account}',
          characterName: '',
        }),
      })),
    copyWhisper: async (template?: string) => {
      if (!account) {
        showToast({
          title: t('market:actions.noAccountTitle'),
          description: t('market:actions.noAccountDescription'),
          variant: 'warning',
        });
        return;
      }
      const current = await ensureFresh();
      if (!current) return;
      try {
        await writeText(buildWhisper(current, template));
        showToast({
          title: t('market:actions.whisperCopied'),
          description: t('market:actions.whisperCopiedDescription', { account }),
        });
      } catch {
        showToast({
          title: t('market:actions.whisperNotCopied'),
          description: t('market:actions.clipboardFailed'),
          variant: 'error',
        });
      }
    },
    ensureFresh,
    openDm: () =>
      openPanel(
        'chat',
        {
          userId: listing.user_id,
          userName: listing.user?.username ?? account ?? undefined,
          draft: `Hi! Is your ${displayName} still available? ${listingUrl(listing)}?display=${encodeURIComponent(displayName)}`,
          reply: true,
        },
        { focus: true },
      ),
    openTrader,
    openWebsite: () => void openUrl(listingUrl(listing)),
  };
}
