export enum ToastActionType {
  OPEN_MARKET_LISTING = 'OPEN_MARKET_LISTING',
  UPDATE_AVAILABLE = 'UPDATE_AVAILABLE',
  OPEN_CHAT_CONVERSATION = 'OPEN_CHAT_CONVERSATION',
  /** data: MarketPanelPayload (e.g. a saved search's alert: { savedSearchId, focusListingId }). */
  OPEN_MARKET_PANEL = 'OPEN_MARKET_PANEL',
}

export interface CustomToastPayload {
  title?: string;
  description?: string;
  /** ms; sonner's default when unset. */
  duration?: number;
  action?: {
    label: string;
    type: ToastActionType;
    data?: any; // Additional data needed for the action (e.g., listing ID)
  };
}

export interface GenericToastPayload {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info';
}
