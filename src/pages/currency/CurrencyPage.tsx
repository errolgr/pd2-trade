import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ChildNetWorthProvider } from '@/hooks/useNetWorth';
import { ItemsProvider } from '@/hooks/useItems';
import { StashValueWindow } from './StashValueWindow';

export function CurrencyPage() {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          <ChildNetWorthProvider>
            <StashValueWindow />
          </ChildNetWorthProvider>
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
}
