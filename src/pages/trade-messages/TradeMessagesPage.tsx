import React from 'react';
import { TradeMessagesContainer } from '@/components/trade/TradeMessagesContainer';
import { useTradeMessages } from '@/hooks/useTradeMessages';

const TradeMessagesPage: React.FC = () => {
  const { trades, removeTrade } = useTradeMessages();

  return (
    <div className="w-full h-full bg-transparent relative">
      <TradeMessagesContainer trades={trades} onClose={removeTrade} />
    </div>
  );
};

export default TradeMessagesPage;

