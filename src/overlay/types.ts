import type { ComponentType } from 'react';
import type { NetWorthTab } from '@/hooks/useNetWorth';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { InboxFilter } from '@/pages/chat/lib/inbox';
import type { SettingsSectionId } from '@/components/dialogs/optionsv2/settings-ui';
import type { MarketPanelPayload } from '@/pages/market/lib/types';

export type PanelId =
  | 'itemSearch'
  | 'quickList'
  | 'currency'
  | 'chat'
  | 'chatButton'
  | 'settings'
  | 'changeLog'
  | 'signIn'
  | 'delist'
  | 'netWorthTicker'
  | 'netWorthPanel'
  | 'market'
  | 'corruptedZoneTimer';

export interface PanelPayloads {
  /** encodeItem(raw) output (what used to be ?text=). undefined only before the first search (the panel is keepMounted). */
  itemSearch: { text: string } | undefined;
  /** item = encodeItemForQuickList(raw); undefined = manage mode */
  quickList: { item?: string; error?: 'not_shared_stash' } | undefined;
  currency: { tab?: NetWorthTab } | undefined;
  /**
   * conversationId/conversation: the conversation to open (conversation: a freshly created one); threadId: a
   * thread by any id it is known by (e.g. `whisper:<name>` of a whisper sender); newestUnread: the newest
   * thread with unread messages; reply: focus the composer; filter: the conversation list filter to show (the
   * offers hotkey opens 'selling'). userId/userName: a website user to message (e.g. a market seller): their
   * thread, or a new one whose first website message starts the conversation. draft: text put in that thread's
   * composer (after any unsent text).
   */
  chat:
    | {
        conversationId?: string;
        conversation?: unknown;
        threadId?: string;
        newestUnread?: boolean;
        reply?: boolean;
        filter?: InboxFilter;
        userId?: string;
        userName?: string;
        draft?: string;
        /** Show the Trader sidebar on the opened thread (a market seller's name was clicked). */
        trader?: boolean;
      }
    | undefined;
  chatButton: undefined;
  /** section: the settings section to show (e.g. the chat's "Manage templates…" opens Chat). */
  settings: { section?: SettingsSectionId } | undefined;
  changeLog: undefined;
  signIn: undefined;
  /** Market listings matching the delisted item (2+; the user picks which one to remove). */
  delist: { listings: MarketListingEntry[] };
  netWorthTicker: undefined;
  netWorthPanel: undefined;
  /** Filters to search right away (merged over defaults), a saved search to run, a listing to focus. */
  market: MarketPanelPayload | undefined;
  corruptedZoneTimer: undefined;
}

/** CSS px relative to the overlay viewport. */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Placement =
  | 'gameCenter' // centered on the game rect
  | 'gameRight' // right-aligned to game rect, full game height (item search)
  | 'screenCenter' // centered on the overlay (= monitor)
  | 'cursor' // top-left at the current OS cursor (clamped)
  | { x: number; y: number }; // CSS px relative to overlay

export interface OpenOptions {
  /** Overrides def.placement for THIS open (only applied when the panel is not already open, unless reposition: true). */
  placement?: Placement;
  reposition?: boolean;
  /** Already open: only bring it to front (keep payload and payloadVersion, e.g. a half-filled form). */
  keepPayload?: boolean;
  /** Claim keyboard focus right away. Opening never does by default: it would take focus (and sound) from the game. */
  focus?: boolean;
}

export interface PanelDef {
  id: PanelId;
  /** The panel content; fills the frame (h-full w-full). */
  component: ComponentType;
  /** CSS px default. */
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable: boolean;
  /** Default placement. */
  placement: Placement;
  /** Restore last user-moved/resized rect from layout-storage (clamped into the overlay). */
  persist: boolean;
  /**
   * onPointerDown: a pointerdown on a text field inside the panel claims keyboard focus (the only time the game
   * loses focus); a pointerdown anywhere else in the panel gives it back.
   */
  keyboard: 'never' | 'onPointerDown';
  /** Closed => display:none but still mounted (state/listeners survive). Mounted (closed) from startup. */
  keepMounted: boolean;
  /** Hidden (not unmounted) while gameFocused === false. */
  hideOnGameBlur: boolean;
  /**
   * Close (keepMounted: hide, state kept) when the user clicks outside every panel (Windows mouse hook), or
   * 150 ms after leaving the overlay or the game for another app unless they come back first. Tauri only.
   */
  closeOnBlur?: boolean;
  /**
   * Which part of the frame takes clicks. 'frame' (default): the whole frame rect. 'children': the frame is
   * click-through (pointer-events none, outside the OS input region); content marks its own interactive
   * elements with `data-interactive="true"` + pointer-events auto (e.g. the chat button orb inside a larger frame).
   */
  interactive?: 'frame' | 'children';
}

export type PanelDefs = Record<PanelId, PanelDef>;
