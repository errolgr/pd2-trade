import React from 'react';
import { TradeMessagesContainer } from '@/components/trade/TradeMessagesContainer';

/** `tradeMessages` panel content (keepMounted: the single useTradeMessages instance lives here). */
const TradeMessagesPage: React.FC = () => (
  <div className="h-full w-full">
    <TradeMessagesContainer />
  </div>
);

export default TradeMessagesPage;
