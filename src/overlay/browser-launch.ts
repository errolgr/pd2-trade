import type { PanelId, PanelPayloads } from './types';

export interface BrowserLaunch {
  id: PanelId;
  payload?: PanelPayloads[PanelId];
}

/**
 * Browser mode only (no Tauri, so no hotkeys): which panel the page URL asks to open on load.
 * `/market` or `?panel=market` opens the market browser; `?item=<name>` pre-fills its item name search.
 * Any other registered panel opens by id with `?panel=<id>`. Unknown ids → null.
 */
export function browserLaunchFromUrl(
  url: Pick<URL, 'pathname' | 'search'>,
  panelIds: readonly string[],
): BrowserLaunch | null {
  const params = new URLSearchParams(url.search);
  const fromPath = url.pathname.replace(/\/+$/, '') === '/market' ? 'market' : null;
  const id = params.get('panel') ?? fromPath;
  if (!id || !panelIds.includes(id)) return null;
  if (id === 'market') {
    const item = params.get('item')?.trim();
    return { id, payload: item ? { filters: { itemName: item } } : undefined };
  }
  return { id: id as PanelId };
}
