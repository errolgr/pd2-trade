import { createContext, useContext } from 'react';
import type { BuildsMode } from '@/lib/builds-api';
import type { MarketItemRef } from './market-link';

/** Navigation shared by every part of the builds panel. */
export interface BuildsActions {
  /** The panel's softcore / hardcore choice. */
  mode: BuildsMode;
  /** Character view (mode omitted: softcore first, then hardcore). */
  openCharacter(name: string, mode?: BuildsMode): void;
  /** Market panel searching this item (in `mode`, default the panel's). */
  searchMarket(item: MarketItemRef, mode?: BuildsMode): void;
  /** Meta tab filtered by this worn item (merc: by merc item). */
  filterMetaByItem(item: { key: string; name: string }, merc?: boolean): void;
  /** Meta tab showing one class. */
  showClassMeta(className: string): void;
}

export const BuildsActionsContext = createContext<BuildsActions | null>(null);

export function useBuildsActions(): BuildsActions {
  const ctx = useContext(BuildsActionsContext);
  if (!ctx) throw new Error('useBuildsActions must be used inside the builds panel');
  return ctx;
}
