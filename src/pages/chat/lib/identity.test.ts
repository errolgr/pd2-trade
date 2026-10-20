import { describe, expect, it } from 'vitest';
import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import type { WhisperPerson } from '@/lib/whisper-history';
import { knownAccounts, linkSender, type LinkCandidate } from './identity';

const sender = (over: Partial<WhisperPerson>): WhisperPerson => ({
  key: 'bob',
  playerName: 'Bob',
  messages: [],
  trades: [],
  readAt: 0,
  ...over,
});

const participant = (accounts: string[], beta_accounts?: string[]): Participant => ({
  _id: 'u1',
  username: 'user',
  created_at: '',
  game: { accounts, beta_accounts },
});

const CANDIDATES: LinkCandidate[] = [
  { threadId: 'c-alice', accounts: knownAccounts(participant(['AliceAcc'], ['AliceBeta']), []) },
  { threadId: 'c-bob', accounts: knownAccounts(participant(['  *BobAcc ']), []) },
  { threadId: 'c-blank', accounts: knownAccounts(participant(['', '  ']), []) },
];

describe('linkSender', () => {
  it('links by the account, ignoring case, spaces and the "*" prefix', () => {
    expect(linkSender(sender({ key: 'bobacc', accountName: 'BOBACC', playerName: 'BOBACC' }), CANDIDATES)).toBe(
      'c-bob',
    );
  });

  it('links by a beta account', () => {
    expect(linkSender(sender({ key: 'alicebeta', playerName: 'AliceBeta' }), CANDIDATES)).toBe('c-alice');
  });

  it("links by a character name that is someone's account", () => {
    expect(
      linkSender(
        sender({ key: 'other', accountName: 'Other', characterName: 'aliceacc', playerName: 'Other' }),
        CANDIDATES,
      ),
    ).toBe('c-alice');
  });

  it('never links on empty names', () => {
    expect(linkSender(sender({ key: '', accountName: '', characterName: ' ', playerName: '' }), CANDIDATES)).toBe(
      undefined,
    );
  });

  it('leaves an unknown sender unlinked (they get their own whisper thread)', () => {
    expect(linkSender(sender({ key: 'zed', playerName: 'Zed' }), CANDIDATES)).toBeUndefined();
  });

  it('knows live, beta and offer accounts, deduplicated case-insensitively, blanks dropped', () => {
    expect(knownAccounts(participant(['A'], ['b']), [{ accountName: '*a ' }, { accountName: 'Thumoi' }, {}])).toEqual([
      'A',
      'b',
      'Thumoi',
    ]);
    expect(knownAccounts(undefined, [{ accountName: ' ' }])).toEqual([]);
  });

  it('links by an account only known from their market offers', () => {
    const thread = { threadId: 'c-u2', accounts: knownAccounts(participant([]), [{ accountName: 'Thumoi' }]) };
    expect(linkSender(sender({ key: 'thumoi', playerName: 'Thumoi' }), [thread])).toBe('c-u2');
  });
});
