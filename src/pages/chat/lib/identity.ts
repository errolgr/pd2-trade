import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { nameAliases, normalizeName, type WhisperPerson } from '@/lib/whisper-history';

/** A website user a whisper sender can be linked to, with the in-game accounts known for them. */
export interface LinkCandidate {
  /** The inbox thread the user's messages live in. */
  threadId: string;
  accounts: readonly string[];
}

/**
 * Every in-game account known for a website user, first seen first (case-insensitive duplicates and blanks
 * dropped): their registered accounts (live, then beta), then the accounts their market offers carry (the
 * offer's user, or the seller of a listing you offered on). The single source for linking whispers to them
 * and for whom a whisper from their thread goes to.
 */
export function knownAccounts(
  participant: Participant | undefined,
  offers: readonly Pick<TradeOffer, 'accountName'>[],
): string[] {
  const accounts = new Map<string, string>();
  for (const raw of [
    ...(participant?.game?.accounts ?? []),
    ...(participant?.game?.beta_accounts ?? []),
    ...offers.map((offer) => offer.accountName),
  ]) {
    const key = normalizeName(raw);
    if (key && !accounts.has(key)) accounts.set(key, raw!.trim().replace(/^\*/, ''));
  }
  return [...accounts.values()];
}

/**
 * The thread of the website user a whisper sender is: the first candidate with a registered account equal
 * (normalized) to the sender's account, character or player name. Empty names never match; undefined when
 * nobody matches (the sender then gets a whisper-only thread of their own).
 */
export function linkSender(
  sender: Pick<WhisperPerson, 'key' | 'accountName' | 'characterName' | 'playerName'>,
  candidates: readonly LinkCandidate[],
): string | undefined {
  const names = new Set([sender.key, sender.accountName, sender.characterName, sender.playerName].flatMap(nameAliases));
  if (names.size === 0) return undefined;
  return candidates.find((candidate) =>
    candidate.accounts.some((account) => nameAliases(account).some((alias) => names.has(alias))),
  )?.threadId;
}

/** The thread id of a whisper sender nobody on the website matched. */
export const whisperThreadId = (key: string) => `whisper:${key}`;
