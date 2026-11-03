import { encodeItem } from '@/lib/item-utils';
import { showToast, type ToastPayload } from './toast';
import type { OverlayState } from './OverlayProvider';
import type { OpenOptions, PanelId, PanelPayloads } from './types';

/** `priceCheck()` without an item: a rare ring with plain, resist and damage-pair rows. */
const SAMPLE_ITEM = {
  name: 'Dread Coil',
  quality: 'Rare',
  type: 'Ring',
  iLevel: 87,
  stats: [
    { stat_id: 105, name: '% Faster Cast Rate', value: 10 },
    { stat_id: 7, name: 'to Life', value: 35, range: { min: 10, max: 40 } },
    { stat_id: 39, name: 'Fire Resist', value: 25, range: { min: 5, max: 30 } },
    { stat_id: 41, name: 'Lightning Resist', value: 20, range: { min: 5, max: 30 } },
    { stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 15, range: { min: 5, max: 15 } },
    { stat_id: 48, name: 'to Minimum Fire Damage', value: 4 },
    { stat_id: 49, name: 'to Maximum Fire Damage', value: 14 },
  ],
};

export interface Pd2OverlayDevHook {
  openPanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  closePanel(id: PanelId): void;
  togglePanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  isOpen(id: PanelId): boolean;
  showToast(payload: ToastPayload): void;
  /**
   * Price-checks `item` as if copied in game: an item object, or the raw clipboard JSON string. Without one, a
   * sample rare ring. `__pd2Overlay.priceCheck()` / `__pd2Overlay.priceCheck(JSON.parse(copiedText))`.
   */
  priceCheck(item?: object | string): void;
  /** Snapshot of the panel state machine. */
  readonly state: OverlayState;
}

declare global {
  interface Window {
    /** Dev builds only: drive the overlay from the browser console / smoke tests. */
    __pd2Overlay?: Pd2OverlayDevHook;
  }
}

/** Exposes window.__pd2Overlay in dev builds; returns the uninstall function. */
export function installDevHook(
  api: Omit<Pd2OverlayDevHook, 'showToast' | 'priceCheck' | 'state'> & { getState(): OverlayState },
) {
  if (!import.meta.env.DEV) return () => {};
  const { getState, ...actions } = api;
  window.__pd2Overlay = {
    ...actions,
    showToast,
    priceCheck: (item = SAMPLE_ITEM) =>
      actions.openPanel('itemSearch', { text: encodeItem(typeof item === 'string' ? item : JSON.stringify(item)) }),
    get state() {
      return getState();
    },
  };
  return () => {
    delete window.__pd2Overlay;
  };
}
