import { useEffect, useState } from 'react';
import { getSimLadderCharacters, type SimCharacter } from '@/lib/sim-characters';

/** How long a loaded list serves every open as is; an older one still shows at once while a new one loads. */
export const SIM_CHARACTERS_FRESH_MS = 5 * 60_000;

export type SimCharactersLoad =
  | { status: 'loading' }
  | { status: 'ok'; data: SimCharacter[] }
  | { status: 'error'; error: unknown };

interface Entry {
  at: number;
  request: Promise<SimCharacter[]>;
  /** The loaded list, or the previous one while a reload runs. */
  value?: SimCharacter[];
  done: boolean;
}

/**
 * Per PD2 login and selected account, in memory for the app session: the price check's popover (remounted on every
 * open) and Net Worth share one list and one request.
 */
const lists = new Map<string, Entry>();
const keyOf = (token: string, account: string) => `${token}\n${account.toLowerCase()}`;

function load(token: string, account: string): Entry {
  const key = keyOf(token, account);
  const previous = lists.get(key);
  if (previous && Date.now() - previous.at < SIM_CHARACTERS_FRESH_MS) return previous;
  const entry: Entry = { at: Date.now(), request: getSimLadderCharacters(token, account), value: previous?.value, done: false };
  lists.set(key, entry);
  entry.request.then(
    (value) => {
      entry.value = value;
      entry.done = true;
    },
    // A failed load is never kept: the next caller asks again (and the previous list keeps showing meanwhile)
    () => {
      if (lists.get(key) !== entry) return;
      if (previous) lists.set(key, previous);
      else lists.delete(key);
    },
  );
  return entry;
}

/** Test seam: forget every loaded list. */
export function clearSimLadderCharactersCache() {
  lists.clear();
}

/**
 * The user's ladder characters for Horadric Sim, cached client side: a list loaded in the last
 * SIM_CHARACTERS_FRESH_MS shows without a request, an older one shows at once and is replaced when the reload
 * answers. An error shows only without a list to fall back on. `retry` changing asks again.
 */
export function useSimLadderCharacters(token: string, account: string, retry = 0): SimCharactersLoad {
  const [state, setState] = useState<SimCharactersLoad>(() => {
    const value = lists.get(keyOf(token, account))?.value;
    return value ? { status: 'ok', data: value } : { status: 'loading' };
  });

  useEffect(() => {
    let live = true;
    const entry = load(token, account);
    const shown = entry.value;
    setState(shown ? { status: 'ok', data: shown } : { status: 'loading' });
    if (entry.done) return;
    entry.request.then(
      (data) => live && setState({ status: 'ok', data }),
      (error) => live && !shown && setState({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [token, account, retry]);

  return state;
}
