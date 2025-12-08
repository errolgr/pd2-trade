import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { CurrencyValuation } from './CurrencyValuation';
import { ItemsProvider } from '@/hooks/useItems';

export function CurrencyPage() {
  return (
      <OptionsProvider>
        <ItemsProvider>
          <Pd2WebsiteProvider>
            <CurrencyValuation />
          </Pd2WebsiteProvider>
        </ItemsProvider>
      </OptionsProvider>
  );
}
