import { createContext, useContext, type ReactNode } from 'react';

/**
 * Built-in strings the components render themselves (screen-reader labels, default retry text). The app passes its
 * translations through `UiLabelsProvider`; the English defaults cover the catalog and plugin previews.
 */
export interface UiLabels {
  close: string;
  more: string;
  retry: string;
  loading: string;
}

export const DEFAULT_UI_LABELS: UiLabels = { close: 'Close', more: 'More', retry: 'Retry', loading: 'Loading…' };

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

export function UiLabelsProvider({ labels, children }: { labels: Partial<UiLabels>; children: ReactNode }) {
  return <UiLabelsContext.Provider value={{ ...DEFAULT_UI_LABELS, ...labels }}>{children}</UiLabelsContext.Provider>;
}

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
