import { describe, expect, it } from 'vitest';
import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import { traderGlyphName } from './chat-parts';

const user = (over: Partial<Participant> = {}): Participant => ({
  _id: 'u1',
  username: 'webname',
  display_name: 'Web Name',
  created_at: '2026-01-01',
  ...over,
});

describe('traderGlyphName', () => {
  it("draws a website user from their in-game account, as pd2trader.com's chat does", () => {
    const thread = { name: 'Web Name', accounts: [] };
    expect(traderGlyphName({ ...thread, participant: user({ in_game_account: 'Live' }) })).toBe('Live');
    expect(
      traderGlyphName({
        ...thread,
        participant: user({ game: { accounts: ['First'], preferences: { account: 'Preferred' } } }),
      }),
    ).toBe('Preferred');
    expect(traderGlyphName({ ...thread, participant: user({ game: { accounts: ['First'] } }) })).toBe('First');
  });

  it('falls back to the username, then an offer account, then the thread name', () => {
    expect(traderGlyphName({ name: 'Web Name', accounts: [], participant: user() })).toBe('webname');
    expect(traderGlyphName({ name: 'seller', accounts: ['OfferAcc'] })).toBe('OfferAcc');
    expect(traderGlyphName({ name: 'whisperer', accounts: [] })).toBe('whisperer');
  });
});
