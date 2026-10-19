// Public overlay API. Deliberately does NOT re-export registry.tsx (it imports every page; main.tsx imports it
// directly), so hooks/pages can import '@/overlay' without import cycles.
export type { OpenOptions, OverlayRect, PanelDef, PanelDefs, PanelId, PanelPayloads, Placement } from './types';
export { OverlayProvider, useOverlay, usePanelOpen, type OverlayApi } from './OverlayProvider';
export { OverlayRoot } from './OverlayRoot';
export { Panel, usePanel, type PanelContextValue } from './Panel';
export { showToast, confirmToast, ToastLayer, type ToastPayload, type ConfirmToastOptions } from './toast';
export { setBadgeCount, getBadgeCount, useBadgeCount, type BadgeKey } from './badges';
export { claimKeyboard, releaseKeyboard } from './keyboard';
