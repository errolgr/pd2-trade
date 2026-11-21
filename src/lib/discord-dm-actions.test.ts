import { describe, expect, it, vi } from 'vitest';
import {
  createDmActionRunner,
  type DmAction,
  type DmActionDeps,
  type DmActionTrade,
  parseDmAction,
  runDmAction,
} from './discord-dm-actions';

const TRADE: DmActionTrade = {
  type: 'whisper',
  from: 'SellerChar',
  account: 'SellerAcc',
  senderUserId: null,
  conversationId: null,
  listingId: null,
  offerId: null,
  itemName: null,
};
const action = (kind: DmAction['kind'], trade: Partial<DmActionTrade> = {}, text = 'yes, 2 ist'): DmAction => ({
  id: `a-${kind}`,
  kind,
  createdAt: '2026-11-20T12:00:00Z',
  ...(kind === 'reply' ? { text } : {}),
  trade: { ...TRADE, ...trade },
});

function deps(overrides: Partial<DmActionDeps> = {}): DmActionDeps {
  return {
    currentUserId: 'me',
    sendMessage: vi.fn(async () => true),
    findConversationWith: vi.fn(async () => null),
    createConversation: vi.fn(async () => 'newconv'),
    resolveUserByNames: vi.fn(async () => null),
    acceptOffer: vi.fn(async () => true),
    rejectOffer: vi.fn(async () => true),
    renewed: vi.fn(async () => null),
    signedIn: () => true,
    ...overrides,
  };
}

describe('parseDmAction', () => {
  it('reads the server event, absent trade fields as null', () => {
    expect(
      parseDmAction({ id: 'u1', kind: 'reply', createdAt: 'x', text: 'hi', trade: { type: 'offer', offerId: 'o1' } }),
    ).toEqual({
      id: 'u1',
      kind: 'reply',
      createdAt: 'x',
      text: 'hi',
      trade: { ...TRADE, type: 'offer', from: null, account: null, offerId: 'o1' },
    });
  });
  it('drops unknown kinds and trade types', () => {
    expect(parseDmAction({ id: 'u1', kind: 'mute', trade: { type: 'whisper' } })).toBeNull();
    expect(parseDmAction({ id: 'u1', kind: 'reply', trade: { type: 'market_watch' } })).toBeNull();
    expect(parseDmAction(null)).toBeNull();
  });
});

describe('reply target', () => {
  it('sends to the reported conversation', async () => {
    const d = deps();
    expect(await runDmAction(action('reply', { conversationId: 'c1', senderUserId: 'u2' }), d)).toEqual({ ok: true });
    expect(d.sendMessage).toHaveBeenCalledWith('c1', 'yes, 2 ist');
    expect(d.findConversationWith).not.toHaveBeenCalled();
  });
  it("uses the sender's existing conversation, else starts one", async () => {
    const existing = deps({ findConversationWith: vi.fn(async () => 'c9') });
    await runDmAction(action('reply', { senderUserId: 'u2' }), existing);
    expect(existing.sendMessage).toHaveBeenCalledWith('c9', 'yes, 2 ist');
    expect(existing.createConversation).not.toHaveBeenCalled();

    const fresh = deps();
    await runDmAction(action('reply', { senderUserId: 'u2' }), fresh);
    expect(fresh.createConversation).toHaveBeenCalledWith('u2');
    expect(fresh.sendMessage).toHaveBeenCalledWith('newconv', 'yes, 2 ist');
  });
  it("resolves a whisper's account and character to a website user", async () => {
    const d = deps({ resolveUserByNames: vi.fn(async () => 'u7') });
    expect(await runDmAction(action('reply', { account: '*SellerAcc' }), d)).toEqual({ ok: true });
    expect(d.resolveUserByNames).toHaveBeenCalledWith(['selleracc', 'sellerchar']);
    expect(d.createConversation).toHaveBeenCalledWith('u7');
  });
  it('is no_target when nobody on the website owns the account, or it is yourself', async () => {
    expect(await runDmAction(action('reply'), deps())).toEqual({ ok: false, error: 'no_target', detail: '*SellerAcc' });
    expect(await runDmAction(action('reply', { senderUserId: 'me' }), deps())).toMatchObject({ error: 'no_target' });
  });
});

describe('sessions and errors', () => {
  it('is signed_out without a PD2 session', async () => {
    const d = deps({ currentUserId: undefined });
    expect(await runDmAction(action('reply', { conversationId: 'c1' }), d)).toEqual({ ok: false, error: 'signed_out' });
    expect(d.sendMessage).not.toHaveBeenCalled();
  });
  it('retries once with the refreshed session after a 401', async () => {
    const renewedDeps = deps();
    const d = deps({ sendMessage: vi.fn(async () => false), renewed: vi.fn(async () => renewedDeps) });
    expect(await runDmAction(action('reply', { conversationId: 'c1' }), d)).toEqual({ ok: true });
    expect(d.sendMessage).toHaveBeenCalledTimes(1);
    expect(renewedDeps.sendMessage).toHaveBeenCalledWith('c1', 'yes, 2 ist');
  });
  it('is signed_out when the refresh ended the session', async () => {
    const d = deps({ sendMessage: vi.fn(async () => false), signedIn: () => false });
    expect(await runDmAction(action('reply', { conversationId: 'c1' }), d)).toEqual({ ok: false, error: 'signed_out' });
  });
  it('is pd2_error when PD2 refuses the message while signed in (blocked)', async () => {
    const d = deps({ sendMessage: vi.fn(async () => false) });
    expect(await runDmAction(action('reply', { conversationId: 'c1' }), d)).toEqual({
      ok: false,
      error: 'pd2_error',
      detail: 'PD2 refused the message',
    });
  });
  it('accepts and declines the reported offer', async () => {
    const d = deps();
    const offer = { type: 'offer' as const, offerId: 'o1', listingId: 'l1' };
    expect(await runDmAction(action('accept_offer', offer), d)).toEqual({ ok: true });
    expect(d.acceptOffer).toHaveBeenCalledWith('l1', 'o1');
    expect(await runDmAction(action('decline_offer', offer), d)).toEqual({ ok: true });
    expect(d.rejectOffer).toHaveBeenCalledWith('o1');
  });
  it('is offer_gone without the offer, or when PD2 no longer has it', async () => {
    expect(await runDmAction(action('accept_offer', { type: 'offer', listingId: 'l1' }), deps())).toEqual({
      ok: false,
      error: 'offer_gone',
    });
    const gone = Object.assign(new Error('API Error: 404 Not Found\n{"message":"gone"}'), { status: 404 });
    const d = deps({ rejectOffer: vi.fn(async () => Promise.reject(gone)) });
    expect(await runDmAction(action('decline_offer', { type: 'offer', offerId: 'o1' }), d)).toEqual({
      ok: false,
      error: 'offer_gone',
    });
  });
  it('is signed_out when the offer call stays unauthorized', async () => {
    const d = deps({ acceptOffer: vi.fn(async () => false) });
    expect(await runDmAction(action('accept_offer', { type: 'offer', offerId: 'o1', listingId: 'l1' }), d)).toEqual({
      ok: false,
      error: 'signed_out',
    });
  });
  it("is pd2_error with the first line of PD2's error", async () => {
    const error = Object.assign(new Error('API Error: 400 Bad Request\n{"message":"listing closed"}'), { status: 400 });
    const d = deps({ acceptOffer: vi.fn(async () => Promise.reject(error)) });
    expect(await runDmAction(action('accept_offer', { type: 'offer', offerId: 'o1', listingId: 'l1' }), d)).toEqual({
      ok: false,
      error: 'pd2_error',
      detail: 'API Error: 400 Bad Request',
    });
  });
});

describe('createDmActionRunner', () => {
  it('runs an action once; a repeat reports the same result again', async () => {
    const d = deps();
    const report = vi.fn(async () => {});
    const onDone = vi.fn();
    const run = createDmActionRunner({ deps: () => d, report, onDone });
    const reply = action('reply', { conversationId: 'c1' });
    await Promise.all([run(reply), run(reply)]);
    await run(reply);
    expect(d.sendMessage).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(3);
    expect(report).toHaveBeenCalledWith('a-reply', { ok: true });
  });
  it('survives a failed result report', async () => {
    const run = createDmActionRunner({ deps: () => deps(), report: async () => Promise.reject(new Error('down')) });
    await expect(run(action('reply', { conversationId: 'c1' }))).resolves.toEqual({ ok: true });
  });
});
