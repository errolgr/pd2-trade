import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import { normalizeName, type WhisperPerson } from '@/lib/whisper-history';

/** A website user a whisper sender can be linked to, with the in-game accounts they registered. */
export interface LinkCandidate {
  /** The inbox thread the user's messages live in. */
  threadId: string;
  accounts: readonly (string | null | undefined)[];
}

/** A participant's registered in-game accounts (live and beta). */
export const participantAccounts = (participant: Participant | undefined) => [
  ...(participant?.game?.accounts ?? []),
  ...(participant?.game?.beta_accounts ?? []),
];

/**
 * The thread of the website user a whisper sender is: the first candidate with a registered account equal
 * (normalized) to the sender's account, character or player name. Empty names never match; undefined when
 * nobody matches (the sender then gets a whisper-only thread of their own).
 */
export function linkSender(
  sender: Pick<WhisperPerson, 'key' | 'accountName' | 'characterName' | 'playerName'>,
  candidates: readonly LinkCandidate[],
): string | undefined {
  const names = new Set(
    [sender.key, sender.accountName, sender.characterName, sender.playerName].map(normalizeName).filter(Boolean),
  );
  if (names.size === 0) return undefined;
  return candidates.find((candidate) =>
    candidate.accounts.some((account) => {
      const normalized = normalizeName(account);
      return normalized !== '' && names.has(normalized);
    }),
  )?.threadId;
}

/** The thread id of a whisper sender nobody on the website matched. */
export const whisperThreadId = (key: string) => `whisper:${key}`;
