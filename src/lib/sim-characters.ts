/**
 * The characters stash items can be sent to in Horadric Sim: the signed-in user's characters (pd2trader.com)
 * that are on the current ladder (PD2's live account list), and which of them to preselect.
 */
import { type AccountCharacter, getAccountCharacters } from '@/lib/builds-api';
import { getMyCharacters } from '@/lib/sim-export-api';

export interface SimCharacter {
  /** As pd2trader.com lists it: the name exports are made with. */
  name: string;
  account: string;
  /** From PD2's account list; absent when PD2 couldn't list the account. */
  className?: string;
  level?: number;
  hardcore?: boolean;
}

/**
 * The user's ladder characters, the selected account's first and each account's highest level first. PD2 drops
 * the ladder flag at a season reset, so these are the current season's. An account PD2 can't list keeps all its
 * characters (without class or level) rather than looking empty.
 */
export async function getSimLadderCharacters(token: string, account: string): Promise<SimCharacter[]> {
  const { accounts } = await getMyCharacters(token);
  const selected = account.toLowerCase();
  const ordered = [...accounts].sort(
    (a, b) => Number(b.account.toLowerCase() === selected) - Number(a.account.toLowerCase() === selected),
  );
  const lists = await Promise.all(
    ordered.map(async ({ account: name, characters }) => {
      let details: AccountCharacter[] | null;
      try {
        details = await getAccountCharacters(name);
      } catch (error) {
        console.warn(`[SimCharacters] PD2 couldn't list ${name}, showing all its characters:`, error);
        details = null;
      }
      if (!details) return characters.map((character): SimCharacter => ({ name: character, account: name }));
      const byName = new Map(details.map((d) => [d.name.toLowerCase(), d]));
      return characters
        .flatMap((character): SimCharacter[] => {
          const d = byName.get(character.toLowerCase());
          return d?.ladder
            ? [{ name: character, account: name, className: d.className, level: d.level, hardcore: d.hardcore }]
            : [];
        })
        .sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
    }),
  );
  return lists.flat();
}

/** The character to preselect: the last one chosen if still listed, else the first (the selected account's highest level). */
export function preferredSimCharacter(characters: SimCharacter[], saved: string): string {
  const key = saved.toLowerCase();
  return (characters.find((c) => c.name.toLowerCase() === key) ?? characters[0])?.name ?? '';
}
