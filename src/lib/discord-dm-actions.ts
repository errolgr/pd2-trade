/**
 * Discord DM actions (two-way DMs): a button or reply form in a pd2trader.com bot DM (Reply, Accept, Decline) becomes
 * an action the server pushes to the signed-in overlay on `GET /api/discord/actions/stream` (Server-Sent Events,
 * `event: dm.action`; pending actions are replayed on connect). The overlay runs it with the user's PD2 token, which
 * the server never sees, and answers `POST /api/discord/actions/:id/result`; the server then edits the DM. An action
 * the overlay doesn't answer within the server's timeout fails as "PC offline".
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { nameAliases } from '@/lib/whisper-history';
import {
  abortableSleep,
  createSseParser,
  MIN_RECONNECT_MS,
  reconnectDelay,
  STABLE_CONNECTION_MS,
  STREAM_IDLE_TIMEOUT_MS,
} from '@/pages/market/alerts/alert-stream';
import type { TradeEventType } from './discord-dm';

export type DmActionKind = 'reply' | 'accept_offer' | 'decline_offer';

/** The trade event the DM was about (as the overlay reported it). */
export interface DmActionTrade {
  type: TradeEventType;
  from: string | null;
  account: string | null;
  senderUserId: string | null;
  conversationId: string | null;
  listingId: string | null;
  offerId: string | null;
  itemName: string | null;
}

/** `event: dm.action`. */
export interface DmAction {
  id: string;
  kind: DmActionKind;
  createdAt: string;
  /** The reply (kind `reply`). */
  text?: string;
  trade: DmActionTrade;
}

/**
 * Why an action failed; the server words it in the DM: `signed_out` (the overlay's PD2 session is gone),
 * `no_target` (no website user for a whisper account), `offer_gone` (offer withdrawn, listing sold), `pd2_error`
 * (PD2 refused, with `detail`).
 */
export type DmActionError = 'signed_out' | 'no_target' | 'pd2_error' | 'offer_gone';

/** `POST /api/discord/actions/:id/result` body. */
export type DmActionResult = { ok: true } | { ok: false; error: DmActionError; detail?: string };

/** Longest `detail` the server keeps. */
export const MAX_ACTION_DETAIL = 200;

const KINDS: readonly DmActionKind[] = ['reply', 'accept_offer', 'decline_offer'];
const optional = (value: unknown) => (typeof value === 'string' && value ? value : null);

/** A `dm.action` event's data as an action; null when it isn't one. */
export function parseDmAction(raw: unknown): DmAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const trade = v.trade as Record<string, unknown> | null | undefined;
  if (typeof v.id !== 'string' || !v.id || !KINDS.includes(v.kind as DmActionKind) || !trade) return null;
  if (trade.type !== 'whisper' && trade.type !== 'offer' && trade.type !== 'site_message') return null;
  return {
    id: v.id,
    kind: v.kind as DmActionKind,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : '',
    ...(typeof v.text === 'string' ? { text: v.text } : {}),
    trade: {
      type: trade.type,
      from: optional(trade.from),
      account: optional(trade.account),
      senderUserId: optional(trade.senderUserId),
      conversationId: optional(trade.conversationId),
      listingId: optional(trade.listingId),
      offerId: optional(trade.offerId),
      itemName: optional(trade.itemName),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Running an action

/** What the executor needs from the PD2 website session (usePd2Website), injectable for tests. */
export interface DmActionDeps {
  /** The signed-in website user; undefined when signed out. */
  currentUserId: string | undefined;
  /** Sends a website message; false when PD2 refused it (blocked) or the session expired. */
  sendMessage: (conversationId: string, text: string) => Promise<boolean>;
  /** The user's existing conversation with `userId`, if any. */
  findConversationWith: (userId: string) => Promise<string | null>;
  /** Starts a conversation with `userId`; its id, or null when PD2 refused or the session expired. */
  createConversation: (userId: string) => Promise<string | null>;
  /** The website user owning one of these in-game names (whisper sender), as the chat links whisper threads. */
  resolveUserByNames: (names: readonly string[]) => Promise<string | null>;
  /** True when PD2 took it; false when the session expired (401). Throws PD2's refusal. */
  acceptOffer: (listingId: string, offerId: string) => Promise<boolean>;
  rejectOffer: (offerId: string) => Promise<boolean>;
  /**
   * After a call answered false: the session with a new token, once the overlay's token refresh (run by the failed
   * call's 401) has produced one; null when it didn't (refresh failed, or the false was a refusal).
   */
  renewed: () => Promise<DmActionDeps | null>;
  /** Whether the overlay still has a PD2 session now (the website user is known). */
  signedIn: () => boolean;
}

class ActionFailure extends Error {
  constructor(
    readonly code: DmActionError,
    readonly detail?: string,
  ) {
    super(detail ?? code);
  }
}
const fail = (code: DmActionError, detail?: string): never => {
  throw new ActionFailure(code, detail);
};

/** HTTP status of a PD2 API error (PD2ApiError carries `status`). */
const statusOf = (error: unknown) =>
  error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : null;

/**
 * Runs a PD2 call; when it answers false (a 401 started the overlay's token refresh, or a refusal), retries once with
 * the renewed session. Still false: `signed_out` when there is no session any more, else `onRefused`.
 */
async function withSession<T>(
  deps: DmActionDeps,
  call: (deps: DmActionDeps) => Promise<T | false>,
  onRefused: () => never,
): Promise<{ value: T; deps: DmActionDeps }> {
  const first = await call(deps);
  if (first !== false) return { value: first, deps };
  const next = await deps.renewed();
  // No new token: a refusal while still signed in, or the session ended
  if (!next) return deps.signedIn() ? onRefused() : fail('signed_out');
  if (!next.currentUserId) return fail('signed_out');
  const second = await call(next);
  if (second !== false) return { value: second, deps: next };
  return onRefused();
}

const falseIfNull = <T>(value: T | null): T | false => (value === null ? false : value);

/** The website user a reply goes to: the reported sender, else the whisper account's owner. */
async function replyTarget(trade: DmActionTrade, deps: DmActionDeps): Promise<string> {
  if (trade.senderUserId) return trade.senderUserId;
  const names = [trade.account, trade.from].flatMap(nameAliases);
  const userId = names.length ? await deps.resolveUserByNames(names) : null;
  return userId ?? fail('no_target', `*${trade.account ?? trade.from ?? 'this player'}`);
}

async function reply(action: DmAction, deps: DmActionDeps): Promise<void> {
  const text = action.text?.trim() || fail('pd2_error', 'Empty reply');
  let conversationId = action.trade.conversationId;
  if (!conversationId) {
    const userId = await replyTarget(action.trade, deps);
    if (userId === deps.currentUserId) fail('no_target', "That's you");
    const started = await withSession(
      deps,
      async (d) => (await d.findConversationWith(userId)) ?? falseIfNull(await d.createConversation(userId)),
      () => fail('pd2_error', 'PD2 did not start the conversation'),
    );
    conversationId = started.value;
    deps = started.deps;
  }
  await withSession(
    deps,
    async (d) => (await d.sendMessage(conversationId!, text)) || false,
    () => fail('pd2_error', 'PD2 refused the message'),
  );
}

async function decide(action: DmAction, deps: DmActionDeps): Promise<void> {
  const { offerId, listingId, type } = action.trade;
  if (type !== 'offer' || !offerId || (action.kind === 'accept_offer' && !listingId)) fail('offer_gone');
  try {
    await withSession(
      deps,
      async (d) =>
        (action.kind === 'accept_offer' ? await d.acceptOffer(listingId!, offerId!) : await d.rejectOffer(offerId!)) ||
        false,
      // A 401 again with a fresh token
      () => fail('signed_out'),
    );
  } catch (error) {
    if (error instanceof ActionFailure) throw error;
    // The offer or listing is gone (withdrawn, sold, deleted)
    if (statusOf(error) === 404 || statusOf(error) === 410) fail('offer_gone');
    throw error;
  }
}

/** Runs one action; never throws. */
export async function runDmAction(action: DmAction, deps: DmActionDeps): Promise<DmActionResult> {
  try {
    if (!deps.currentUserId) fail('signed_out');
    if (action.kind === 'reply') await reply(action, deps);
    else await decide(action, deps);
    return { ok: true };
  } catch (error) {
    if (error instanceof ActionFailure)
      return { ok: false, error: error.code, ...(error.detail ? { detail: clipDetail(error.detail) } : {}) };
    // PD2 errors carry the response body after the first line ("API Error: 400 Bad Request\n{…}")
    const detail = (error instanceof Error && error.message.split('\n')[0]) || 'Failed';
    return { ok: false, error: 'pd2_error', detail: clipDetail(detail) };
  }
}

const clipDetail = (detail: string) =>
  detail.length > MAX_ACTION_DETAIL ? `${detail.slice(0, MAX_ACTION_DETAIL - 1)}…` : detail;

/** Runs an action once and reports its result (see {@link createDmActionRunner}). */
export type DmActionRunner = (action: DmAction) => Promise<DmActionResult>;

/**
 * Runs each action once: an action delivered again (a reconnect replay) gets the first run's result reported again
 * instead of a second message or a second accept.
 */
export function createDmActionRunner(options: {
  deps: () => DmActionDeps;
  report: (id: string, result: DmActionResult) => Promise<void>;
  onDone?: (action: DmAction, result: DmActionResult) => void;
}): DmActionRunner {
  const results = new Map<string, Promise<DmActionResult>>();
  return async (action: DmAction): Promise<DmActionResult> => {
    let run = results.get(action.id);
    const first = !run;
    if (!run) {
      run = runDmAction(action, options.deps());
      results.set(action.id, run);
      if (results.size > 500) results.delete(results.keys().next().value!);
    }
    const result = await run;
    if (first) options.onDone?.(action, result);
    await options.report(action.id, result).catch((error) => {
      console.warn('[DiscordDm] Could not report an action result:', error);
    });
    return result;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The server

export async function postDmActionResult(token: string, id: string, result: DmActionResult): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/discord/actions/${encodeURIComponent(id)}/result`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  // 409: finished already (an earlier result, or timed out); 404: no such action (expired, another user's)
  if (!response.ok && response.status !== 409 && response.status !== 404)
    throw new Error(`Action result ${response.status}`);
}

export class DmActionStreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'DmActionStreamError';
  }
}

export async function openDmActionStream(token: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(`${BACKEND_URL}/api/discord/actions/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal,
  });
  if (!response.ok) {
    const retryAfter = Number(response.headers?.get('retry-after'));
    throw new DmActionStreamError(
      `Discord actions ${response.status}`,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
    );
  }
  return response;
}

/** Answers that won't change by retrying with the same token: signed out (401), no such route (404, older server). */
const FINAL_STATUSES = [401, 403, 404];

export interface DmActionStreamOptions {
  token: string;
  open?: (token: string, signal: AbortSignal) => Promise<Response>;
  onAction: (action: DmAction) => void;
  onRefused?: (status: number) => void;
  signal: AbortSignal;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

/** Keeps the action stream open until `signal` aborts or the server refuses the token (the intents stream's pattern). */
export async function runDmActionStream(options: DmActionStreamOptions): Promise<void> {
  const { token, onAction, signal } = options;
  const open = options.open ?? openDmActionStream;
  const sleep = options.sleep ?? abortableSleep;
  const now = options.now ?? Date.now;
  let serverRetryMs = MIN_RECONNECT_MS;
  let attempt = 0;

  while (!signal.aborted) {
    const current = new AbortController();
    const abortConnection = () => current.abort();
    signal.addEventListener('abort', abortConnection);
    let retryAfterMs: number | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let connectedAt: number | null = null;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => current.abort(), STREAM_IDLE_TIMEOUT_MS);
    };
    try {
      const response = await open(token, current.signal);
      connectedAt = now();
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Action stream has no body');
      current.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}), { once: true });
      const decoder = new TextDecoder();
      const parser = createSseParser(
        (event) => {
          if (event.event !== 'dm.action') return;
          try {
            const action = parseDmAction(JSON.parse(event.data));
            if (action) onAction(action);
          } catch (error) {
            console.warn('[DiscordDm] bad action event:', error);
          }
        },
        (ms) => {
          serverRetryMs = ms;
        },
      );
      resetIdle();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        resetIdle();
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (error instanceof DmActionStreamError) {
        if (FINAL_STATUSES.includes(error.status)) {
          options.onRefused?.(error.status);
          return;
        }
        retryAfterMs = error.retryAfterMs;
      } else if (!signal.aborted && !current.signal.aborted) {
        console.warn('[DiscordDm] action stream error:', error);
      }
    } finally {
      clearTimeout(idle);
      signal.removeEventListener('abort', abortConnection);
      current.abort();
    }
    if (signal.aborted) return;
    if (connectedAt !== null && now() - connectedAt >= STABLE_CONNECTION_MS) attempt = 0;
    await sleep(reconnectDelay(attempt, serverRetryMs, retryAfterMs, options.random), signal);
    attempt++;
  }
}
