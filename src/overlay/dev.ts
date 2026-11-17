import { encodeItem } from '@/lib/item-utils';
import { DEV_PRICE_CHECK_SAMPLES } from './dev-samples';
import { notify, showToast, type ToastPayload } from './toast';
import type { OverlayState } from './OverlayProvider';
import type { OpenOptions, PanelId, PanelPayloads } from './types';

export interface Pd2OverlayDevHook {
  openPanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  closePanel(id: PanelId): void;
  togglePanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  isOpen(id: PanelId): boolean;
  showToast(payload: ToastPayload): void;
  /** A notification as the app logs it: `notify('offer', { title, description }, { toast: false })` = missed. */
  notify: typeof notify;
  /**
   * Price-checks `item` as if copied in game: an item object, or the raw clipboard JSON string. Without one, the first
   * dev sample (a rare ring). `__pd2Overlay.priceCheck()` / `__pd2Overlay.priceCheck(JSON.parse(copiedText))`.
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
  api: Omit<Pd2OverlayDevHook, 'showToast' | 'notify' | 'priceCheck' | 'state'> & { getState(): OverlayState },
) {
  if (!import.meta.env.DEV) return () => {};
  const { getState, ...actions } = api;
  window.__pd2Overlay = {
    ...actions,
    showToast,
    notify,
    priceCheck: (item = DEV_PRICE_CHECK_SAMPLES[0].item) =>
      actions.openPanel('itemSearch', { text: encodeItem(typeof item === 'string' ? item : JSON.stringify(item)) }),
    get state() {
      return getState();
    },
  };
  return () => {
    delete window.__pd2Overlay;
  };
}
