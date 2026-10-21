import { showToast, useOverlay } from '@/overlay';
import { openUrl } from '@/lib/browser-opener';
import { writeText } from '@/lib/browser-clipboard';
import { useChatTemplates } from '@/hooks/useChatTemplates';
import { fillTemplate, templatePlaceholders, type ChatTemplate } from '@/lib/message-templates';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { itemDisplayName, listingUrl, sellerAccount } from '../lib/listing';
import { buildWhisper } from '../lib/whisper';

export interface ListingActions {
  /** Copies `/w *account …` (default wording, or `template` in buildWhisper's tokens) and toasts. */
  copyWhisper: (template?: string) => Promise<void>;
  /** Chat panel: the seller's thread with a listing link drafted. */
  openDm: () => void;
  openWebsite: () => void;
  /** The user's chat templates usable as a whisper (no custom placeholders), tokens mapped to buildWhisper's. */
  whisperTemplates: ChatTemplate[];
}

/** Whisper / message / website actions shared by the detail pane and the result cards. */
export function useListingActions(listing: MarketListingEntry): ListingActions {
  const { openPanel } = useOverlay();
  const { templates } = useChatTemplates();
  // buildWhisper falls back to the website username, as the price check does
  const account = sellerAccount(listing) || listing.user?.username || null;
  const displayName = itemDisplayName(listing.item);

  return {
    whisperTemplates: templates
      .filter((t) => templatePlaceholders(t.text).length === 0)
      .map((t) => ({
        ...t,
        // buildWhisper fills (and sanitizes) the listing values
        text: fillTemplate(t.text, {
          itemName: '{item}',
          price: '{price}',
          accountName: '{account}',
          characterName: '',
        }),
      })),
    copyWhisper: async (template?: string) => {
      if (!account) {
        showToast({
          title: 'No in-game account',
          description: 'This listing names no account to whisper. Message the seller on the site instead.',
          variant: 'warning',
        });
        return;
      }
      try {
        await writeText(buildWhisper(listing, template));
        showToast({ title: 'Whisper copied', description: `Paste it into the game chat to message *${account}.` });
      } catch {
        showToast({ title: 'Whisper not copied', description: "Couldn't write to the clipboard.", variant: 'error' });
      }
    },
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
    openWebsite: () => void openUrl(listingUrl(listing)),
  };
}
