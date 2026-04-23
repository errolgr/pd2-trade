import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { CurrencyValuation } from './CurrencyValuation';
import { ItemsProvider } from '@/hooks/useItems';

export function CurrencyPage() {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          <CurrencyValuation />
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
}
