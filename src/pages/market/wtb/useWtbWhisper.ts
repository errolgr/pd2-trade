import { useCallback } from 'react';
import { showToast } from '@/overlay';
import { writeText } from '@/lib/browser-clipboard';
import { trackEvent } from '@/lib/telemetry';
import { useWhisperHistory } from '@/hooks/useWhisperHistory';
import { useOptions } from '@/hooks/useOptions';
import { t } from '@/i18n';
import { contactWtbRequest, wtbContactBody, type WtbContactChannel, type WtbContactItem } from '../alerts/wtb-api';
import {
  wtbBackWhisper,
  wtbBackWhisperText,
  wtbResponseAccount,
  wtbWhisper,
  wtbWhisperText,
  type WtbRequest,
  type WtbResponse,
} from '../lib/wtb';

export interface WtbWhisperActions {
  /**
   * Whisper the buyer the chat's way: `/w *account …` on the clipboard, kept as an outgoing whisper in Chat. `item`:
   * what the user has for the request (the price-checked item, a stash or listing item), sent with the contact so
   * the buyer is told what they have.
   */
  whisper: (request: WtbRequest, item?: WtbContactItem | null) => Promise<void>;
  /** Only copies the `/w *account …` line (the contact is sent the same). */
  copyWhisper: (request: WtbRequest, item?: WtbContactItem | null) => Promise<void>;
  whisperBack: (response: WtbResponse) => Promise<void>;
  /** The seller whispers the buyer of a request they answered again (copied and kept in Chat; not a new contact). */
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
 * Contacting a buyer: the whisper (wtbWhisper) goes on the clipboard for the game chat, and the request counts the
 * contact (`/contact`, best effort; signed in, with the user's account and the item: a response the buyer is told
 * about). Must render under WhisperHistoryProvider.
 */
export function useWtbWhisper(source: 'priceCheck' | 'listItem' | 'market' | 'chat' | 'alert'): WtbWhisperActions {
  const { recordCopied } = useWhisperHistory();
  const { settings } = useOptions();
  const token = settings?.pd2Token || null;
  const account = settings?.account || null;
  const send = useCallback(
    async (request: WtbRequest, channel: WtbContactChannel, item: WtbContactItem | null | undefined) => {
      if (!(await copyLine(wtbWhisper(request)))) return;
      if (channel === 'whisper')
        recordCopied({ accountName: request.whisperTo, playerName: request.whisperTo }, wtbWhisperText(request));
      showToast({
        title: t('market:actions.whisperCopied'),
        description: t('market:actions.whisperCopiedDescription', { account: request.whisperTo }),
      });
      trackEvent('wtb_buyer_contacted', { source, action: channel, item: !!item });
      contactWtbRequest(request.id, wtbContactBody(channel, item, account), token).catch((error) =>
        console.warn('[wtb] contact not counted:', error),
      );
    },
    [recordCopied, source, account, token],
  );
  const whisperBack = useCallback(
    async (response: WtbResponse) => {
      if (!(await copyLine(wtbBackWhisper(response)))) return;
      const seller = wtbResponseAccount(response);
      recordCopied({ accountName: seller, playerName: seller }, wtbBackWhisperText(response));
      showToast({
        title: t('market:actions.whisperCopied'),
        description: t('market:actions.whisperCopiedDescription', { account: seller }),
      });
      trackEvent('wtb_response_whisper_back', { source });
    },
    [recordCopied, source],
  );
  const whisperBuyer = useCallback(
    async (response: WtbResponse) => {
      const { request } = response;
      if (!(await copyLine(wtbWhisper(request)))) return;
      recordCopied({ accountName: request.whisperTo, playerName: request.whisperTo }, wtbWhisperText(request));
      showToast({
        title: t('market:actions.whisperCopied'),
        description: t('market:actions.whisperCopiedDescription', { account: request.whisperTo }),
      });
    },
    [recordCopied],
  );
  return {
    whisper: useCallback((request, item) => send(request, 'whisper', item), [send]),
    copyWhisper: useCallback((request, item) => send(request, 'copy', item), [send]),
    whisperBack,
    whisperBuyer,
  };
}
