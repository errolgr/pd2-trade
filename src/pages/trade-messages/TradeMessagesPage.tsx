import React from 'react';
import { TradeMessagesContainer } from '@/components/trade/TradeMessagesContainer';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { OptionsProvider } from '@/hooks/useOptions';

const TradeMessagesPage: React.FC = () => {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <Pd2WebsiteProvider>
          <div className="w-screen h-screen">
            <TradeMessagesContainer />
          </div>
        </Pd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
};

export default TradeMessagesPage;
