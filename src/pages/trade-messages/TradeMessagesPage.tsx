import React from 'react';
import { TradeMessagesContainer } from '@/components/trade/TradeMessagesContainer';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { OptionsProvider } from '@/hooks/useOptions';

const TradeMessagesPage: React.FC = () => {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          <div className="w-screen h-screen">
            <TradeMessagesContainer />
          </div>
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
};

export default TradeMessagesPage;
