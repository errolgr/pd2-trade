import ItemPage from '@/pages/price-check/ItemPage';
import { QuickListPage } from '@/pages/quick-list/QuickListPage';
import { StashValueWindow } from '@/pages/currency/StashValueWindow';
import ChatPage from '@/pages/chat/ChatPage';
import ChatButtonPage from '@/pages/chat/ChatButtonPage';
import TradeMessagesPage from '@/pages/trade-messages/TradeMessagesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import ChangelogPage from '@/pages/change-log/ChangeLogPage';
import SignInPage from '@/pages/sign-in/SignInPage';
import { DelistPage } from '@/pages/delist/DelistPage';
import NetWorthTickerPage from '@/pages/net-worth/NetWorthTickerPage';
import NetWorthPanelPage from '@/pages/net-worth/NetWorthPanelPage';
import { NET_WORTH_PANEL_SIZE } from '@/pages/net-worth/overlay';
import type { PanelDefs } from './types';

/**
 * Every overlay panel. Each page owner tunes ONLY its own entry. Passed to <OverlayProvider defs={PANEL_DEFS}>
 * from main.tsx (kept out of '@/overlay' so importing the overlay API never pulls in every page).
 */
export const PANEL_DEFS: PanelDefs = {
  // ---- itemSearch (Group Search) ----
  itemSearch: {
    id: 'itemSearch',
    component: ItemPage,
    size: { width: 500, height: 800 }, // height = game height via placement 'gameRight'
    resizable: false,
    placement: 'gameRight',
    persist: false,
    keyboard: 'onPointerDown',
    // Like the old price-check window (activated on show): without focus, clicking back into the game is no
    // focus change, so closeOnBlur could never fire. Hotkeys hand focus back to the game before copying.
    focusOnOpen: true,
    keepMounted: true,
    hideOnGameBlur: true,
    closeOnBlur: true,
  },

  // ---- quickList (Group Search) ----
  quickList: {
    id: 'quickList',
    component: QuickListPage,
    size: { width: 600, height: 512 },
    resizable: true,
    placement: 'cursor', // manage mode opens with { placement: 'gameCenter' }
    persist: false,
    keyboard: 'onPointerDown',
    keepMounted: true, // queued listings keep polling while closed (the old window was hidden, not destroyed)
    hideOnGameBlur: true,
  },

  // ---- currency (Group ChatButton/NetWorth) ----
  currency: {
    id: 'currency',
    component: StashValueWindow,
    size: { width: 760, height: 870 },
    resizable: false,
    placement: 'screenCenter',
    persist: true,
    keyboard: 'onPointerDown',
    focusOnOpen: true,
    keepMounted: false,
    hideOnGameBlur: true,
  },

  // ---- chat (Group Chat/Trade) ----
  chat: {
    id: 'chat',
    component: ChatPage,
    size: { width: 1000, height: 700 },
    resizable: false,
    placement: 'gameCenter',
    persist: true,
    keyboard: 'onPointerDown',
    focusOnOpen: true, // typing goes to the chat right away (the old window was focused on show)
    keepMounted: true,
    hideOnGameBlur: true,
    closeOnBlur: true,
  },

  // ---- chatButton (Group ChatButton/NetWorth) ----
  chatButton: {
    id: 'chatButton',
    component: ChatButtonPage,
    size: { width: 240, height: 240 },
    resizable: false,
    placement: 'gameBottomRight',
    persist: true,
    keyboard: 'never',
    keepMounted: true,
    hideOnGameBlur: true,
    // the orb sits centered in the frame; only it (and the expanded fan) take clicks
    interactive: 'children',
  },

  // ---- tradeMessages (Group Chat/Trade) ----
  tradeMessages: {
    id: 'tradeMessages',
    component: TradeMessagesPage,
    size: { width: 600, height: 400 },
    resizable: true,
    placement: 'gameCenter',
    persist: true,
    keyboard: 'onPointerDown',
    focusOnOpen: true, // the old window was focused on show
    keepMounted: true,
    hideOnGameBlur: true,
    closeOnBlur: true,
  },

  // ---- settings (Group Settings) ----
  settings: {
    id: 'settings',
    component: SettingsPage,
    size: { width: 1025, height: 700 },
    resizable: false,
    placement: 'screenCenter',
    persist: true,
    keyboard: 'onPointerDown',
    focusOnOpen: true,
    keepMounted: true,
    hideOnGameBlur: true,
    closeOnBlur: true,
  },

  // ---- changeLog (Group Settings) ----
  changeLog: {
    id: 'changeLog',
    component: ChangelogPage,
    size: { width: 600, height: 600 },
    resizable: false,
    placement: 'screenCenter',
    persist: false,
    keyboard: 'onPointerDown',
    focusOnOpen: true,
    keepMounted: false,
    hideOnGameBlur: true,
  },

  // ---- signIn (Group Settings) ----
  signIn: {
    id: 'signIn',
    component: SignInPage,
    size: { width: 380, height: 260 },
    resizable: false,
    placement: 'screenCenter',
    persist: false,
    keyboard: 'onPointerDown',
    focusOnOpen: true,
    keepMounted: false,
    hideOnGameBlur: false,
  },

  // ---- delist (Group Search) ----
  delist: {
    id: 'delist',
    component: DelistPage,
    size: { width: 420, height: 320 },
    resizable: true,
    placement: 'cursor',
    persist: false,
    keyboard: 'onPointerDown',
    focusOnOpen: true,
    keepMounted: false,
    hideOnGameBlur: true,
    closeOnBlur: true,
  },

  // ---- netWorthTicker (Group ChatButton/NetWorth) ----
  netWorthTicker: {
    id: 'netWorthTicker',
    component: NetWorthTickerPage,
    size: { width: 320, height: 32 },
    resizable: false,
    placement: 'gameCenter', // the ticker sizes and places itself (anchor setting / dragged position) via setRect
    persist: true,
    keyboard: 'never',
    keepMounted: true,
    hideOnGameBlur: true,
  },

  // ---- netWorthPanel (Group ChatButton/NetWorth) ----
  netWorthPanel: {
    id: 'netWorthPanel',
    component: NetWorthPanelPage,
    size: NET_WORTH_PANEL_SIZE,
    resizable: false,
    placement: 'gameCenter', // the ticker opens it beside itself ({ placement: { x, y } })
    persist: false,
    keyboard: 'onPointerDown',
    keepMounted: false,
    hideOnGameBlur: true,
  },
};
