/**
 * Discord DM notifications on pd2trader.com (server docs/api.md "Discord DM notifications"): the user's DM settings
 * (`/api/notifications/*`), their Discord link (`/api/account/discord`), and the trade events the overlay reports while
 * the player is away (`POST /api/notify`: whispers, offers, website chat messages), which the server's bot DMs to the
 * linked Discord account. Every call takes the user's PD2 token as bearer.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';

export const DM_TYPES = [
  'whisper',
  'offer',
  'site_message',
  'market_watch',
  'listing_sold',
  'listing_expiring',
] as const;
export type DmType = (typeof DM_TYPES)[number];
/** What the overlay reports: the events only it sees. */
export type TradeEventType = 'whisper' | 'offer' | 'site_message';

/** `GET/PUT /api/notifications/prefs`. */
export interface DmPrefs {
  types: Record<DmType, boolean>;
  /** Lowercased account or character names whose trade events never DM. */
  mutedTraders: string[];
  /** ISO date-time; no DMs until then. */
  snoozedUntil: string | null;
  /** Idle minutes before the overlay reports trade events (0: always). */
  awayMinutes: number;
}
export type DmPrefsUpdate = Partial<Omit<DmPrefs, 'types'>> & { types?: Partial<Record<DmType, boolean>> };

/** `GET /api/notifications/status`. */
export interface DmStatus {
  /** The Discord bot is configured on the server. */
  enabled: boolean;
  linked: boolean;
  discordName: string | null;
  lastDmAt: string | null;
  /** The last DM Discord refused (code 50007: DMs closed), until one is delivered again. */
  lastDmFailure: { reason: string; code: number | null; at: string } | null;
}

/** `POST /api/account/discord/code`. */
export interface DiscordLinkCode {
  code: string;
  expiresAt: string;
  /** What to type in Discord: `/link code:XXXXXXXX`. */
  command: string;
  instructions: string;
  inviteUrl: string | null;
}

/** `POST /api/notify` body. */
export interface TradeReport {
  type: TradeEventType;
  /** The other player's character (whispers) or website/account name. */
  from: string;
  account?: string;
  message: string;
  itemName?: string;
  listingId?: string;
  offerText?: string;
  /** PD2 ids the DM's Reply / Accept / Decline buttons act on (discord-dm-actions). */
  offerId?: string;
  conversationId?: string;
  senderUserId?: string;
}

/** `POST /api/notify` answer (202). */
export interface NotifyResult {
  queued: boolean;
  reason?: string;
  id?: string;
  coalesced?: boolean;
}

/** The server's limits (dm-notifier.service.ts TRADE_REPORT_LIMITS, notification-prefs.service.ts TRADER_NAME). */
export const TRADER_NAME = /^[A-Za-z0-9._-]{1,32}$/;
const LIMITS = { message: 500, itemName: 120, offerText: 200, id: 64 } as const;
export const MAX_AWAY_MINUTES = 240;
/** `from` of an offer or message whose sender the overlay can't name. */
export const UNKNOWN_SENDER = 'Someone';

export class DiscordDmApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'DiscordDmApiError';
  }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `pd2trader.com answered ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    } catch {
      // non-JSON error body
    }
    throw new DiscordDmApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export const getDmPrefs = (token: string) => request<DmPrefs>('/api/notifications/prefs', token);
export const updateDmPrefs = (token: string, update: DmPrefsUpdate) =>
  request<DmPrefs>('/api/notifications/prefs', token, { method: 'PUT', body: JSON.stringify(update) });
export const getDmStatus = (token: string) => request<DmStatus>('/api/notifications/status', token);
export const sendTestDm = (token: string) =>
  request<{ sent: boolean; error: string | null }>('/api/notifications/test', token, { method: 'POST' });
export const issueDiscordLinkCode = (token: string) =>
  request<DiscordLinkCode>('/api/account/discord/code', token, { method: 'POST' });
export const reportTradeEvent = (token: string, report: TradeReport) =>
  request<NotifyResult>('/api/notify', token, { method: 'POST', body: JSON.stringify(report) });

// ---------------------------------------------------------------------------------------------------------------
// What to report

/**
 * A name the server takes as `from` / `account` (letters, digits, `.`, `_`, `-`, at most 32): an account's `*`
 * prefix and other characters dropped; null when nothing is left.
 */
export function sanitizeTraderName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const name = raw
    .trim()
    .replace(/^\*/, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 32);
  return TRADER_NAME.test(name) ? name : null;
}

const clip = (text: string | null | undefined, max: number): string | undefined => {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

/** A trade event as the overlay saw it, before it is fitted to the server's contract. */
export interface TradeEvent {
  type: TradeEventType;
  /** The sender's name as seen (character, `*account`, website username); unusable names fall back to `fallbackFrom`. */
  from?: string | null;
  /** Used when `from` is missing or unusable; none: the event is not reported. */
  fallbackFrom?: string | null;
  account?: string | null;
  message?: string | null;
  itemName?: string | null;
  listingId?: string | null;
  offerText?: string | null;
  offerId?: string | null;
  conversationId?: string | null;
  senderUserId?: string | null;
}

const ID_FIELDS = ['listingId', 'offerId', 'conversationId', 'senderUserId'] as const;

/** The `POST /api/notify` body of an event: names sanitized, texts clipped; null when it has no usable sender. */
export function toTradeReport(event: TradeEvent): TradeReport | null {
  const from = sanitizeTraderName(event.from) ?? sanitizeTraderName(event.fallbackFrom);
  if (!from) return null;
  const account = sanitizeTraderName(event.account);
  const report: TradeReport = {
    type: event.type,
    from,
    ...(account && account !== from ? { account } : {}),
    message: clip(event.message, LIMITS.message) ?? defaultMessage(event.type),
    ...(clip(event.itemName, LIMITS.itemName) ? { itemName: clip(event.itemName, LIMITS.itemName) } : {}),
    ...(clip(event.offerText, LIMITS.offerText) ? { offerText: clip(event.offerText, LIMITS.offerText) } : {}),
  };
  // PD2 ids are alphanumeric (the server refuses anything else)
  for (const field of ID_FIELDS) {
    const id = event[field]?.trim();
    if (id && id.length <= LIMITS.id && /^[A-Za-z0-9]+$/.test(id)) report[field] = id;
  }
  return report;
}

function defaultMessage(type: TradeEventType): string {
  if (type === 'offer') return 'New offer on your listing';
  if (type === 'site_message') return 'New message';
  return '(empty whisper)';
}

/** Away: no input for `awayMinutes` (0: always). Unknown idle time (not Windows) counts as present. */
export function isAway(idleMs: number | null | undefined, awayMinutes: number): boolean {
  if (awayMinutes <= 0) return true;
  if (idleMs == null) return false;
  return idleMs >= awayMinutes * 60_000;
}

/** Why a report is not sent; null: send it. The server checks toggles, snooze and mutes again. */
export type ReportSkip = 'signed_out' | 'unavailable' | 'not_linked' | 'disabled' | 'snoozed' | 'muted' | 'present';

export function reportSkipReason(
  report: TradeReport,
  settings: DmSettings | null,
  idleMs: number | null,
  now: number,
): ReportSkip | null {
  if (!settings) return 'unavailable';
  const { prefs, status } = settings;
  if (!status.enabled) return 'unavailable';
  if (!status.linked) return 'not_linked';
  if (!prefs.types[report.type]) return 'disabled';
  if (prefs.snoozedUntil && Date.parse(prefs.snoozedUntil) > now) return 'snoozed';
  const muted = new Set(prefs.mutedTraders.map((name) => name.toLowerCase()));
  if ([report.from, report.account].some((name) => name && muted.has(name.toLowerCase()))) return 'muted';
  if (!isAway(idleMs, prefs.awayMinutes)) return 'present';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The reporter: settings cached per token

/** How long fetched prefs and status are trusted before the next report fetches them again. */
export const DM_SETTINGS_TTL_MS = 5 * 60_000;

/** The user's DM prefs and link status. */
export interface DmSettings {
  prefs: DmPrefs;
  status: DmStatus;
}

interface CachedSettings {
  token: string;
  at: number;
  /** null: the server didn't answer (or has no DMs); nothing is reported until the next fetch. */
  value: DmSettings | null;
}

export interface DmReporterDeps {
  /** The signed-in user's PD2 token (undefined: signed out). */
  getToken: () => string | null | undefined;
  /** Milliseconds since the last keyboard/mouse input; null when unknown. */
  idleMs: () => Promise<number | null>;
  now?: () => number;
}

export interface DmReporter {
  /** Reports the event when the player is away and their prefs want it. Never throws. */
  report(
    event: TradeEvent,
  ): Promise<{ sent: boolean; skip?: ReportSkip | 'no_sender' | 'failed'; result?: NotifyResult }>;
  /** The user's DM prefs and link status (cached up to DM_SETTINGS_TTL_MS); null when the server didn't answer. */
  settings(token: string): Promise<DmSettings | null>;
  /** Fresh prefs and status (the settings page changed them, or just opened). */
  setSettings(token: string, value: DmSettings): void;
  /** Forgets the cached settings: the next report fetches them. */
  invalidate(): void;
  /** Called with every fetched or set value (the action stream connects while the user is linked). */
  subscribe(listener: (value: DmSettings | null) => void): () => void;
}

export function createDmReporter(deps: DmReporterDeps): DmReporter {
  const now = deps.now ?? Date.now;
  let cache: CachedSettings | null = null;
  let loading: Promise<CachedSettings['value']> | null = null;
  const listeners = new Set<(value: DmSettings | null) => void>();
  const store = (token: string, value: DmSettings | null) => {
    cache = { token, at: now(), value };
    for (const listener of [...listeners]) listener(value);
  };

  const settingsFor = async (token: string) => {
    if (cache && cache.token === token && now() - cache.at < DM_SETTINGS_TTL_MS) return cache.value;
    loading ??= (async () => {
      let value: CachedSettings['value'] = null;
      try {
        const [prefs, status] = await Promise.all([getDmPrefs(token), getDmStatus(token)]);
        value = { prefs, status };
      } catch (error) {
        console.warn('[DiscordDm] Could not load DM settings:', error);
      }
      store(token, value);
      return value;
    })().finally(() => {
      loading = null;
    });
    return loading;
  };

  return {
    async report(event) {
      const token = deps.getToken();
      if (!token) return { sent: false, skip: 'signed_out' };
      const report = toTradeReport(event);
      if (!report) return { sent: false, skip: 'no_sender' };
      try {
        const [settings, idleMs] = await Promise.all([settingsFor(token), deps.idleMs().catch(() => null)]);
        const skip = reportSkipReason(report, settings, idleMs, now());
        if (skip) return { sent: false, skip };
        const result = await reportTradeEvent(token, report);
        return { sent: true, result };
      } catch (error) {
        console.warn('[DiscordDm] Could not report a trade event:', error);
        return { sent: false, skip: 'failed' };
      }
    },
    settings: settingsFor,
    setSettings: store,
    invalidate() {
      cache = null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
