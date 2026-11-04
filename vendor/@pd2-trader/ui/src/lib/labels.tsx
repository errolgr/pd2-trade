import { createContext, useContext, type ReactNode } from 'react';

/**
 * Built-in strings the components render themselves (screen-reader labels, default retry text, units). The app
 * passes its translations through `UiLabelsProvider`; the English defaults cover the catalog and plugin previews.
 */
export interface UiLabels {
  close: string;
  more: string;
  retry: string;
  loading: string;
  /** Gold amount with its unit ("2,500,000 gold"); `amount` is already locale-formatted. */
  gold: (amount: string) => string;
  /** BCP 47 locale for number formatting (PriceTag, CurrencyAmount); undefined = the runtime default. */
  locale: string | undefined;
  /** Pagination: nav landmark, button text, screen-reader labels. */
  pagination: string;
  previous: string;
  next: string;
  previousPage: string;
  nextPage: string;
  morePages: string;
}

export const DEFAULT_UI_LABELS: UiLabels = {
  close: 'Close',
  more: 'More',
  retry: 'Retry',
  loading: 'Loading…',
  gold: (amount) => `${amount} gold`,
  locale: undefined,
  pagination: 'Pagination',
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  morePages: 'More pages',
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

export function UiLabelsProvider({ labels, children }: { labels: Partial<UiLabels>; children: ReactNode }) {
  return <UiLabelsContext.Provider value={{ ...DEFAULT_UI_LABELS, ...labels }}>{children}</UiLabelsContext.Provider>;
}

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
