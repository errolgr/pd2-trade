// Re-export the hook from ViewManagerContext for convenience
export { useViewManager } from '@/contexts/ViewManagerContext';
export type { ViewType, ViewPosition, ViewConfig } from '@/contexts/ViewManagerContext';

// View ID constants
export const VIEW_IDS = {
  ITEM_SEARCH: 'item-search',
  QUICK_LIST: 'quick-list',
  CURRENCY: 'currency',
  CHAT: 'chat',
  MARKET_SEARCH: 'market-search',
  TRADE_MESSAGES: 'trade-messages',
  CHAT_BUTTON: 'chat-button',
  SETTINGS: 'settings',
  CHANGELOG: 'changelog',
  COMMAND_MENU: 'command-menu',
  DELIST_POPUP: 'delist-popup',
} as const;
