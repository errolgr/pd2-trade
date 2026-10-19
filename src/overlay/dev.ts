import { showToast, type ToastPayload } from './toast';
import type { OverlayState } from './OverlayProvider';
import type { OpenOptions, PanelId, PanelPayloads } from './types';

export interface Pd2OverlayDevHook {
  openPanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  closePanel(id: PanelId): void;
  togglePanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  isOpen(id: PanelId): boolean;
  showToast(payload: ToastPayload): void;
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
export function installDevHook(api: Omit<Pd2OverlayDevHook, 'showToast' | 'state'> & { getState(): OverlayState }) {
  if (!import.meta.env.DEV) return () => {};
  const { getState, ...actions } = api;
  window.__pd2Overlay = {
    ...actions,
    showToast,
    get state() {
      return getState();
    },
  };
  return () => {
    delete window.__pd2Overlay;
  };
}
