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
  /** CodeBlock copy button: action label, the confirmation shown after copying, the error toast when copy fails. */
  copy: string;
  copied: string;
  copyFailed: string;
  /** Sidebar: trigger/rail label and the narrow-viewport sheet's screen-reader title. */
  toggleSidebar: string;
  sidebar: string;
  /** DataTable: filter field, column menu, empty state, row selection and pagination. */
  filterRows: string;
  columns: string;
  toggleColumns: string;
  noResults: string;
  selectAll: string;
  selectRow: string;
  rowsSelected: (selected: number, total: number) => string;
  rowsPerPage: string;
  pageOf: (page: number, count: number) => string;
  /** Field: muted tag after an optional field's label. */
  optional: string;
  /** SearchInput / Combobox: clear button. */
  clear: string;
  /** Combobox: default placeholder, empty list, heading of hint/keyword-only matches, rows past the limit. */
  searchPlaceholder: string;
  noMatches: string;
  otherMatches: string;
  moreMatches: (count: number) => string;
  /** NumberInput: −/+ button labels (`label` names the value), the Shift step tooltip and out-of-range hints. */
  decrease: (label: string) => string;
  increase: (label: string) => string;
  bigStep: (step: number) => string;
  numberMin: (min: number) => string;
  numberMax: (max: number) => string;
  wholeNumber: string;
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
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: "Couldn't copy. Select the text and copy it yourself.",
  toggleSidebar: 'Toggle sidebar',
  sidebar: 'Sidebar',
  filterRows: 'Filter…',
  columns: 'Columns',
  toggleColumns: 'Toggle columns',
  noResults: 'No results',
  selectAll: 'Select all',
  selectRow: 'Select row',
  rowsSelected: (selected, total) => `${selected} of ${total} selected`,
  rowsPerPage: 'Rows per page',
  pageOf: (page, count) => `Page ${page} of ${count}`,
  optional: 'optional',
  clear: 'Clear',
  searchPlaceholder: 'Search…',
  noMatches: 'No matches',
  otherMatches: 'Other matches',
  moreMatches: (count) => `${count} more — keep typing to narrow`,
  decrease: (label) => `Decrease ${label}`,
  increase: (label) => `Increase ${label}`,
  bigStep: (step) => `Shift: ±${step}`,
  numberMin: (min) => `Min ${min}`,
  numberMax: (max) => `Max ${max}`,
  wholeNumber: 'Whole number',
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

export function UiLabelsProvider({ labels, children }: { labels: Partial<UiLabels>; children: ReactNode }) {
  return <UiLabelsContext.Provider value={{ ...DEFAULT_UI_LABELS, ...labels }}>{children}</UiLabelsContext.Provider>;
}

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
