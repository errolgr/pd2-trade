import { createContext, useContext } from 'react';

/**
 * Portal target of the enclosing panel: a layer inside the panel frame, so Radix poppers/dialogs/sheets hide with
 * their panel (display:none) and stack with it. Standalone module so components/ui can import it without pulling
 * in the overlay provider.
 */
export const PanelPortalContext = createContext<HTMLElement | null>(null);

/** The enclosing panel's portal layer; undefined outside panels (Radix then portals to document.body). */
export function usePanelPortalContainer(): HTMLElement | undefined {
  return useContext(PanelPortalContext) ?? undefined;
}
