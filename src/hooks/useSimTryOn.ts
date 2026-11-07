import { useCallback, useEffect, useRef } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { tryOnItem } from '@/lib/sim-try-on';
import { showToast } from '@/overlay';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';

/**
 * The try-on hotkey's action (see tryOnItem) for a copied item (the game's clipboard JSON), with the current login,
 * default character and stash. The returned function keeps its identity: it reads the latest state when called.
 */
export function useSimTryOn(): (raw: string) => Promise<void> {
  const { settings, updateSettings } = useOptions();
  const access = useSimAccess();
  const { fetchAndCacheStash } = usePd2Website();
  const latest = useRef({ settings, updateSettings, access, fetchAndCacheStash });
  useEffect(() => {
    latest.current = { settings, updateSettings, access, fetchAndCacheStash };
  });
  return useCallback(async (raw: string) => {
    let item: PriceCheckItem;
    try {
      item = JSON.parse(raw);
    } catch {
      showToast({ title: 'Horadric Sim', description: "This item can't be read.", variant: 'error' });
      return;
    }
    const { settings: s, updateSettings: update, access: a, fetchAndCacheStash: stash } = latest.current;
    await tryOnItem(item, {
      token: s.pd2Token || null,
      account: s.account,
      simCharacter: s.simCharacter,
      canUse: a === undefined ? undefined : (a?.canUse ?? null),
      stash: () => stash(),
      notify: ({ title, description, variant }) => showToast({ title, description, variant }),
      onSent: (simLastExport) => update({ simLastExport }),
    });
  }, []);
}
