import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { CurrencyValuation } from './CurrencyValuation';

export function CurrencyPage() {
  return (
      <OptionsProvider>
        <Pd2WebsiteProvider>
          <CurrencyValuation />
        </Pd2WebsiteProvider>
      </OptionsProvider>
  );
}
