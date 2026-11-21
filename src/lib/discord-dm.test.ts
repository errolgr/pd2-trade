import { describe, expect, it } from 'vitest';
import {
  type DmPrefs,
  type DmStatus,
  isAway,
  reportSkipReason,
  sanitizeTraderName,
  toTradeReport,
  type TradeReport,
  UNKNOWN_SENDER,
} from './discord-dm';
import { offerEvent, offerFor } from '@/hooks/useDiscordDmReporter';
import type { TradeOffer } from '@/hooks/useTradeOffers';

const PREFS: DmPrefs = {
  types: {
    whisper: true,
    offer: true,
    site_message: true,
    market_watch: false,
    listing_sold: true,
    listing_expiring: true,
  },
  mutedTraders: [],
  snoozedUntil: null,
  awayMinutes: 5,
};
const STATUS: DmStatus = { enabled: true, linked: true, discordName: 'me', lastDmAt: null, lastDmFailure: null };
const NOW = Date.parse('2026-11-20T12:00:00Z');
const MIN = 60_000;
const WHISPER: TradeReport = { type: 'whisper', from: 'Seller', message: 'hi' };

describe('isAway', () => {
  it('is away after awayMinutes without input', () => {
    expect(isAway(5 * MIN, 5)).toBe(true);
    expect(isAway(5 * MIN - 1, 5)).toBe(false);
  });
  it('is always away at 0 minutes, even when idle time is unknown', () => {
    expect(isAway(0, 0)).toBe(true);
    expect(isAway(null, 0)).toBe(true);
  });
  it('counts unknown idle time (not Windows) as present', () => {
    expect(isAway(null, 5)).toBe(false);
    expect(isAway(undefined, 1)).toBe(false);
  });
});

describe('reportSkipReason', () => {
  const settings = { prefs: PREFS, status: STATUS };
  it('sends when away, linked and wanted', () => {
    expect(reportSkipReason(WHISPER, settings, 10 * MIN, NOW)).toBeNull();
  });
  it('skips while the player is at the keyboard', () => {
    expect(reportSkipReason(WHISPER, settings, MIN, NOW)).toBe('present');
  });
  it('skips without settings, without the bot, or without a link', () => {
    expect(reportSkipReason(WHISPER, null, 10 * MIN, NOW)).toBe('unavailable');
    expect(reportSkipReason(WHISPER, { prefs: PREFS, status: { ...STATUS, enabled: false } }, 10 * MIN, NOW)).toBe(
      'unavailable',
    );
    expect(reportSkipReason(WHISPER, { prefs: PREFS, status: { ...STATUS, linked: false } }, 10 * MIN, NOW)).toBe(
      'not_linked',
    );
  });
  it('skips a type turned off, and while snoozed', () => {
    const off = { ...PREFS, types: { ...PREFS.types, whisper: false } };
    expect(reportSkipReason(WHISPER, { prefs: off, status: STATUS }, 10 * MIN, NOW)).toBe('disabled');
    const snoozed = { ...PREFS, snoozedUntil: new Date(NOW + MIN).toISOString() };
    expect(reportSkipReason(WHISPER, { prefs: snoozed, status: STATUS }, 10 * MIN, NOW)).toBe('snoozed');
    const lapsed = { ...PREFS, snoozedUntil: new Date(NOW - MIN).toISOString() };
    expect(reportSkipReason(WHISPER, { prefs: lapsed, status: STATUS }, 10 * MIN, NOW)).toBeNull();
  });
  it('skips muted traders by name or account, case-insensitively', () => {
    const muted = { prefs: { ...PREFS, mutedTraders: ['seller', 'altacc'] }, status: STATUS };
    expect(reportSkipReason(WHISPER, muted, 10 * MIN, NOW)).toBe('muted');
    expect(reportSkipReason({ ...WHISPER, from: 'Other', account: 'AltAcc' }, muted, 10 * MIN, NOW)).toBe('muted');
    expect(reportSkipReason({ ...WHISPER, from: 'Other' }, muted, 10 * MIN, NOW)).toBeNull();
  });
});

describe('sanitizeTraderName', () => {
  it('keeps valid names and drops an account star', () => {
    expect(sanitizeTraderName('Some_Char-1')).toBe('Some_Char-1');
    expect(sanitizeTraderName('*myaccount')).toBe('myaccount');
  });
  it('drops characters the server refuses and caps the length', () => {
    expect(sanitizeTraderName(' John Doe! ')).toBe('JohnDoe');
    expect(sanitizeTraderName('a'.repeat(40))).toBe('a'.repeat(32));
  });
  it('is null when nothing is left', () => {
    expect(sanitizeTraderName('★☆')).toBeNull();
    expect(sanitizeTraderName('')).toBeNull();
    expect(sanitizeTraderName(undefined)).toBeNull();
  });
});

describe('toTradeReport', () => {
  it('maps a whisper', () => {
    expect(
      toTradeReport({ type: 'whisper', from: '*Buyer', message: ' wtb shako ', itemName: 'Harlequin Crest' }),
    ).toEqual({
      type: 'whisper',
      from: 'Buyer',
      message: 'wtb shako',
      itemName: 'Harlequin Crest',
    });
  });
  it('skips a sender it cannot name, unless there is a fallback', () => {
    expect(toTradeReport({ type: 'whisper', from: '???', message: 'x' })).toBeNull();
    expect(toTradeReport({ type: 'site_message', from: null, fallbackFrom: 'Display Name', message: 'x' })?.from).toBe(
      'DisplayName',
    );
  });
  it('clips long texts and drops a listing id the server would refuse', () => {
    const report = toTradeReport({
      type: 'offer',
      from: 'buyer',
      message: 'm'.repeat(600),
      offerText: 'o'.repeat(300),
      listingId: 'not/an-id',
    })!;
    expect(report.message).toHaveLength(500);
    expect(report.offerText).toHaveLength(200);
    expect(report).not.toHaveProperty('listingId');
  });
  it('fills an empty message and leaves out an account equal to the sender', () => {
    expect(toTradeReport({ type: 'offer', from: 'acc', account: 'acc', message: '' })).toEqual({
      type: 'offer',
      from: 'acc',
      message: 'New offer on your listing',
    });
  });
});

describe('offer reports', () => {
  const at = NOW;
  const offer = (id: string, minutesAgo: number, extra: Partial<TradeOffer> = {}): TradeOffer => ({
    id,
    isIncoming: true,
    playerName: `user${id}`,
    accountName: `acc${id}`,
    itemName: 'Shako',
    price: '2 Ist',
    timestamp: new Date(at - minutesAgo * MIN),
    listingId: 'L1',
    ...extra,
  });

  it("finds the newest incoming offer on the notification's listing", () => {
    const offers = [
      offer('a', 0.5),
      offer('b', 0.1),
      offer('c', 0, { listingId: 'L2' }),
      offer('d', 0, { isIncoming: false }),
    ];
    expect(offerFor(offers, 'L1', at)?.id).toBe('b');
  });
  it('ignores offers made well before the notification', () => {
    expect(offerFor([offer('old', 30)], 'L1', at)).toBeUndefined();
  });
  it('maps the offer: website user, account, item, price, listing', () => {
    expect(toTradeReport(offerEvent('offered 2 Ist', 'L1', offer('a', 0)))).toEqual({
      type: 'offer',
      from: 'usera',
      account: 'acca',
      message: 'offered 2 Ist',
      itemName: 'Shako',
      listingId: 'L1',
      offerText: '2 Ist',
    });
  });
  it('reports an offer whose sender never showed up as from someone', () => {
    expect(toTradeReport(offerEvent(undefined, 'L1'))).toEqual({
      type: 'offer',
      from: UNKNOWN_SENDER,
      message: 'New offer on your listing',
      listingId: 'L1',
    });
  });
});
