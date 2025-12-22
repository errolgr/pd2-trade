import config from '../common/window-config.json';

export const WindowLabels = config.labels as {
  readonly Main: 'Main';
  readonly Chat: 'Chat';
  readonly ChatButton: 'ChatButton';
  readonly TradeMessages: 'TradeMessages';
  readonly QuickList: 'QuickList';
  readonly ItemSearch: 'ItemSearch';
  readonly Settings: 'Settings';
  readonly Currency: 'Currency';
  readonly Toast: 'Toast';
};

export const WindowTitles = config.titles as {
  readonly Main: 'PD2Trader';
  readonly Chat: 'PD2Trader: Chat';
  readonly ChatButton: 'PD2Trader: Button';
  readonly TradeMessages: 'PD2Trader: Trade Messages';
  readonly QuickList: 'PD2Trader: QuickList';
  readonly ItemSearch: 'PD2Trader: Item Search';
  readonly Settings: 'PD2Trader: Settings';
  readonly Currency: 'PD2Trader: Currency';
  readonly Toast: 'PD2Trader: Toast';
  readonly PREFIX: 'PD2Trader';
};
