import { useEffect, useState } from 'react';
import type { Conversation } from '@/common/types/pd2-website/ChatTypes';
import {
  createDmActionRunner,
  type DmAction,
  type DmActionDeps,
  type DmActionError,
  type DmActionResult,
  postDmActionResult,
  runDmActionStream,
} from '@/lib/discord-dm-actions';
import { nameAliases } from '@/lib/whisper-history';
import { showToast } from '@/overlay';
import { knownAccounts } from '@/pages/chat/lib/identity';
import { lookupSellerByName } from '@/pages/chat/lib/seller-lookup';
import type { Pd2WebsiteContextType } from './pd2website/usePD2Website';
import { usePd2Website } from './pd2website/usePD2Website';
import { dmReporter } from './useDiscordDmReporter';
import { useOAuth } from './useOAuth';
import type { ISettings } from './useOptions';
import { acceptOffer, rejectOffer } from './useTradeOffers';

/** Conversations searched for the sender's thread (newest first). */
const CONVERSATION_LOOKUP_LIMIT = 50;
/** How often a signed-in user's link status is checked again (they may link or unlink on the website). */
const LINK_RECHECK_MS = 10 * 60_000;
/** How long a failed PD2 call waits for the overlay's token refresh to reach the session before giving up. */
export const RENEW_WAIT_MS = 4_000;

const DONE_TITLE: Record<DmAction['kind'], string> = {
  reply: 'Replied from Discord',
  accept_offer: 'Offer accepted from Discord',
  decline_offer: 'Offer declined from Discord',
};
const FAILED_TITLE: Record<DmAction['kind'], string> = {
  reply: 'Discord reply not sent',
  accept_offer: 'Could not accept the offer from Discord',
  decline_offer: 'Could not decline the offer from Discord',
};
const ERROR_TEXT: Record<DmActionError, string> = {
  signed_out: 'PD2 Trader is signed out. Sign in again.',
  no_target: "Couldn't find this player on the PD2 website",
  offer_gone: 'The offer or listing is gone',
  pd2_error: 'PD2 refused it',
};

function actionToast(action: DmAction, result: DmActionResult) {
  const who = action.trade.from ?? action.trade.account;
  showToast({
    title: result.ok ? DONE_TITLE[action.kind] : FAILED_TITLE[action.kind],
    description: result.ok
      ? action.kind === 'reply'
        ? `${who ? `To ${who}: ` : ''}${action.text ?? ''}`
        : (action.trade.itemName ?? who ?? undefined)
      : (result.detail ?? ERROR_TEXT[result.error]),
    variant: result.ok ? 'success' : 'error',
  });
}

/** The PD2 session the runner acts with: the latest render's (a stream outlives renders). */
interface Session {
  website: Pd2WebsiteContextType;
  token: string | undefined;
  refreshToken: string | undefined;
  refreshTokens: (refreshToken: string) => Promise<boolean>;
}
let session: Session | null = null;
/** Woken on every session change (a refreshed token reaching the session). */
const sessionWaiters = new Set<() => void>();

/** The session once its token differs from `token`; null when that doesn't happen within RENEW_WAIT_MS. */
function renewedSession(token: string | undefined): Promise<Session | null> {
  // new Promise, not Promise.withResolvers: older WebView2 runtimes lack it
  return new Promise((resolve) => {
    const check = () => {
      if (session && session.token !== token) done(session);
    };
    const done = (value: Session | null) => {
      sessionWaiters.delete(check);
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), RENEW_WAIT_MS);
    sessionWaiters.add(check);
    check();
  });
}

/** One runner per app run: its once-only memory outlives stream reconnects, token refreshes and remounts. */
const runAction = createDmActionRunner({
  // The stream starts after the hook's first render stored the session
  deps: () => actionDeps(session!),
  report: async (id, result) => {
    if (session?.token) await postDmActionResult(session.token, id, result);
  },
  onDone: (action, result) => {
    actionToast(action, result);
    if (result.ok && action.kind !== 'reply') void session?.website.refresh();
  },
});

/**
 * Exactly one instance (AppController): while the signed-in user has a linked Discord account, holds the
 * `GET /api/discord/actions/stream` connection (the server's "overlay online") and runs the Reply / Accept / Decline
 * actions clicked in their bot DMs with their PD2 session (website message, offer accept/reject), then reports each
 * result so the server edits the DM. Signed out (no token, or the PD2 session ended): no stream, so the server
 * answers clicks with "not running" at once.
 */
export function useDiscordDmActions(settings: ISettings | undefined) {
  const website = usePd2Website();
  const { refreshTokens } = useOAuth();
  const token = settings?.pd2Token;
  const refreshToken = settings?.pd2RefreshToken;
  const [linked, setLinked] = useState(false);
  /** The token the stream refused (401/403/404): not retried until it changes. */
  const [refusedToken, setRefusedToken] = useState<string | null>(null);

  useEffect(() => dmReporter.subscribe((value) => setLinked(!!value?.status.enabled && !!value.status.linked)), []);
  useEffect(() => {
    if (!token) return;
    void dmReporter.settings(token);
    const timer = setInterval(() => void dmReporter.settings(token), LINK_RECHECK_MS);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    session = { website, token, refreshToken, refreshTokens };
    for (const wake of [...sessionWaiters]) wake();
  });

  const signedIn = !!token && !!website.authData;
  const active = signedIn && linked && token !== refusedToken;
  useEffect(() => {
    if (!active || !token) return;
    const controller = new AbortController();
    void runDmActionStream({
      token,
      onAction: (action) => void runAction(action),
      onRefused: (status) => {
        setRefusedToken(token);
        // An expired token: the overlay's refresh brings a new one, which reconnects
        if (status === 401 && refreshToken) void refreshTokens(refreshToken);
      },
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [active, token, refreshToken, refreshTokens]);
}

/** The executor's view of a PD2 session: the chat's website-message path and the offer calls. */
export function actionDeps(current: Session): DmActionDeps {
  const { website, token } = current;
  const me = token ? website.authData?.user?._id : undefined;
  // Offer calls go straight to PD2: on a 401 they start the overlay's token refresh (the chat calls do so themselves)
  const onAuthError = async () => {
    if (current.refreshToken) await current.refreshTokens(current.refreshToken);
  };
  let conversations: Promise<Conversation[]> | null = null;
  const myConversations = () =>
    (conversations ??= me
      ? website
          .getConversations(me, { limit: CONVERSATION_LOOKUP_LIMIT })
          .then((page) => page?.data ?? [])
          .catch(() => [])
      : Promise.resolve([]));

  return {
    currentUserId: me,
    sendMessage: async (conversationId, text) => !!(me && (await website.sendMessage(conversationId, text, me))),
    findConversationWith: async (userId) =>
      (await myConversations()).find((c) => c.participant_ids.length === 2 && c.participant_ids.includes(userId))
        ?._id ?? null,
    createConversation: async (userId) => {
      const created: Conversation | null = me ? await website.createConversation([me, userId]) : null;
      return created?._id ?? null;
    },
    // As the chat links a whisper sender to a website user: their offers, their conversations, then the market
    resolveUserByNames: async (names) => {
      const wanted = new Set(names);
      const matches = (accounts: readonly (string | undefined)[]) =>
        accounts.flatMap(nameAliases).some((alias) => wanted.has(alias));
      const offer = [...website.incomingOffers, ...website.outgoingOffers].find(
        (o) => o.userId && matches([o.accountName, o.playerName]),
      );
      if (offer?.userId) return offer.userId;
      for (const conversation of await myConversations())
        for (const participant of conversation.participants ?? [])
          if (participant._id !== me && matches(knownAccounts(participant, []))) return participant._id;
      for (const name of wanted) {
        const lookup = await lookupSellerByName(name);
        if (lookup.status === 'found') return lookup.seller.userId;
        if (lookup.status === 'failed') break;
      }
      return null;
    },
    acceptOffer: (listingId, offerId) => acceptOffer({ pd2Token: token }, listingId, offerId, onAuthError),
    rejectOffer: (offerId) => rejectOffer({ pd2Token: token }, offerId, onAuthError),
    signedIn: () => !!session?.token && !!session.website.authData,
    renewed: async () => {
      const next = await renewedSession(token);
      return next?.token ? actionDeps(next) : null;
    },
  };
}
