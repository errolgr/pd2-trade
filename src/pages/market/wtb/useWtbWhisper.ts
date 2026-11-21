import { useCallback } from 'react';
import { showToast, useOverlay } from '@/overlay';
import { writeText } from '@/lib/browser-clipboard';
import { trackEvent } from '@/lib/telemetry';
import { useWhisperHistory } from '@/hooks/useWhisperHistory';
import { useOptions } from '@/hooks/useOptions';
import { t } from '@/i18n';
import { contactWtbRequest, wtbContactBody, type WtbContactItem } from '../alerts/wtb-api';
import { wtbBackWhisperText, wtbWhisper, wtbWhisperText, type WtbRequest, type WtbResponse } from '../lib/wtb';

export interface WtbWhisperActions {
  /**
   * Message the buyer in the website chat (Chat panel, draft filled in). `item`: what the user has for the request
   * (the price-checked item, a stash or listing item); the contact (with it) is recorded by the chat once a message
   * to the buyer is actually sent from that thread (see `wtbContact` on the chat payload).
   */
  whisper: (request: WtbRequest, item?: WtbContactItem | null) => Promise<void>;
  /** Copies the `/w *account …` line for the game chat; the contact is recorded right away. */
  copyWhisper: (request: WtbRequest, item?: WtbContactItem | null) => Promise<void>;
  /** The buyer messages a seller who answered their request (website chat; never a contact). */
  whisperBack: (response: WtbResponse) => Promise<void>;
  /** The seller messages the buyer of a request they answered again (website chat; never a contact). */
  whisperBuyer: (response: WtbResponse) => Promise<void>;
}

/** Copies `line`; false (with the error toast) when the clipboard refused it. */
async function copyLine(line: string): Promise<boolean> {
  try {
    await writeText(line);
    return true;
  } catch {
    showToast({
      title: t('market:actions.whisperNotCopied'),
      description: t('market:actions.clipboardFailed'),
      variant: 'error',
    });
    return false;
  }
}

/**
 * Contacting a buyer or seller: "Message" opens the website chat with them (draft filled in, like a listing's
 * Message seller), the contact recorded only once a message is actually sent there; "Copy whisper" puts
 * `/w *account …` on the clipboard for the game chat and records the contact (`/contact`, best effort; signed in,
 * with the user's account and the item: a response the buyer is told about). Must render under
 * WhisperHistoryProvider.
 */
export function useWtbWhisper(source: 'priceCheck' | 'listItem' | 'market' | 'chat' | 'alert'): WtbWhisperActions {
  const { recordCopied } = useWhisperHistory();
  const { openPanel } = useOverlay();
  const { settings } = useOptions();
  const token = settings?.pd2Token || null;
  const account = settings?.account || null;
  const openChat = useCallback(
    (
      user: { userId: string; name: string },
      draft: string,
      wtbContact?: { requestId: string; item?: WtbContactItem },
    ) =>
      openPanel(
        'chat',
        { userId: user.userId, userName: user.name, draft, reply: true, ...(wtbContact && { wtbContact }) },
        { focus: true },
      ),
    [openPanel],
  );
  const message = useCallback(
    async (request: WtbRequest, item?: WtbContactItem | null) => {
      openChat(request.buyer, wtbWhisperText(request), { requestId: request.id, ...(item && { item }) });
      trackEvent('wtb_buyer_contacted', { source, action: 'message', item: !!item });
    },
    [openChat, source],
  );
  const copyWhisper = useCallback(
    async (request: WtbRequest, item?: WtbContactItem | null) => {
      if (!(await copyLine(wtbWhisper(request)))) return;
      recordCopied({ accountName: request.whisperTo, playerName: request.whisperTo }, wtbWhisperText(request));
      showToast({
        title: t('market:actions.whisperCopied'),
        description: t('market:actions.whisperCopiedDescription', { account: request.whisperTo }),
      });
      trackEvent('wtb_buyer_contacted', { source, action: 'copy', item: !!item });
      contactWtbRequest(request.id, wtbContactBody('copy', item, account), token).catch((error) =>
        console.warn('[wtb] contact not counted:', error),
      );
    },
    [recordCopied, source, account, token],
  );
  const whisperBack = useCallback(
    async (response: WtbResponse) => {
      openChat(response.seller, wtbBackWhisperText(response));
      trackEvent('wtb_response_whisper_back', { source });
    },
    [openChat, source],
  );
  const whisperBuyer = useCallback(
    async (response: WtbResponse) => openChat(response.request.buyer, wtbWhisperText(response.request)),
    [openChat],
  );
  return { whisper: message, copyWhisper, whisperBack, whisperBuyer };
}
