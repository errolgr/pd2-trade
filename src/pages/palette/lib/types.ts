import type { ReactNode } from 'react';
import type { OverlayApi } from '@/overlay';

/**
 * The command palette's contract between its shell (PalettePage: input, groups, Tab scoping, Ctrl+K action menu,
 * recents / pins) and its sources (one hook per group in ../sources). The shell owns ordering across groups and
 * the recents boost; a source owns matching and ranking inside its group.
 */

/** The mixed list's fixed group order. */
export const PALETTE_GROUPS = ['actions', 'items', 'builds', 'chat', 'listings', 'settings'] as const;
export type PaletteGroupId = (typeof PALETTE_GROUPS)[number];

/** Plain JSON a source keeps on a ref to rebuild its item later (recents and pins are saved in settings). */
export type PaletteRefData = Record<string, string | number | boolean | null>;

/**
 * A serializable pointer to one result. `id` is `${group}:${stable key}` and unique across the palette (recents,
 * pins and React keys use it); `title` is the display fallback; `data` is whatever the source needs to rebuild the
 * item without searching (e.g. an item's baseCode, a character's mode).
 */
export interface PaletteRef {
  id: string;
  group: PaletteGroupId;
  title: string;
  data?: PaletteRefData;
}

/**
 * The palette narrowed to one group (Tab, or a result that drills in). `param` is source-defined: the builds source
 * lists an account's characters for `account:<name>`, the settings source a select's options for `setting:<key>`.
 * `label` is the scope chip's text (default: the group's name).
 */
export interface PaletteScope {
  group: PaletteGroupId;
  param?: string;
  label?: string;
}

export interface PaletteRunContext {
  openPanel: OverlayApi['openPanel'];
  /** Closes the palette (the shell already does after an action without keepOpen). */
  close(): void;
  /** Narrows the palette (clears the query); Backspace on an empty query goes back. */
  scope(scope: PaletteScope): void;
}

export interface PaletteAction {
  /** Unique within its item. */
  id: string;
  label: string;
  icon?: ReactNode;
  /** Keycap text shown beside it in the action menu (display only). */
  shortcut?: string;
  /** Keep the palette open afterwards (inline setting changes, drilling in with ctx.scope). */
  keepOpen?: boolean;
  run(ctx: PaletteRunContext): void | Promise<void>;
}

export interface PaletteItem {
  ref: PaletteRef;
  /** Muted kind text after the title ("character", "Net worth"). */
  subtitle?: string;
  /** Small pill after the title (the nickname a search matched, e.g. "shako"). */
  badge?: string;
  icon?: ReactNode;
  /** Right-aligned content: a price, "Lv 97 Paladin", a switch. Not focusable; the row's Enter does the work. */
  trailing?: ReactNode;
  /** Enter. */
  primary: PaletteAction;
  /** The Ctrl+K / → menu, after the primary action. The shell appends Pin / Unpin. */
  actions?: PaletteAction[];
  /** Extra classes on the title, e.g. an item's quality color. */
  titleClassName?: string;
  /** A guess (a typo match): listed in place, but never the row highlighted by default. */
  weak?: boolean;
}

export interface PaletteSourceInput {
  /** Trimmed query; '' on the empty state. */
  query: string;
  /** The active scope when it is this source's group (a source may use scope.param); null otherwise. */
  scope: PaletteScope | null;
  /** How many items the shell will show: a few in the mixed list, more when scoped. */
  limit: number;
  /**
   * With an empty query: this group's recents and pins, newest first, to resolve into live items (same order; drop
   * refs that no longer resolve). Empty while there is a query.
   */
  refs: PaletteRef[];
}

export interface PaletteSourceResult {
  items: PaletteItem[];
  /** A server lookup for the current query is in flight (the shell shows the loading bar). */
  loading: boolean;
  /** This source needs a signed-in PD2 account; the shell shows one Sign in row instead of signed-out groups. */
  signedOut?: boolean;
}

/**
 * A source is a React hook the shell calls on every render, in PALETTE_GROUPS order, while the palette is open.
 * It must be cheap when the query doesn't concern it and must never throw: a failed lookup is reported
 * (reportApiError) and answers no items.
 */
export type PaletteSource = (input: PaletteSourceInput) => PaletteSourceResult;

/** Server lookups start once the query has this many characters, after PALETTE_DEBOUNCE_MS without typing. */
export const PALETTE_REMOTE_MIN_CHARS = 3;
export const PALETTE_DEBOUNCE_MS = 200;
