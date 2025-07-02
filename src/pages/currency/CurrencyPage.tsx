import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { CurrencyValuation } from './CurrencyValuation';
import { DialogProvider } from '@/hooks/useDialog';

export function CurrencyPage() {
  return (
    <DialogProvider>
      <OptionsProvider>
        <Pd2WebsiteProvider>
          <CurrencyValuation />
        </Pd2WebsiteProvider>
      </OptionsProvider>
    </DialogProvider>
  );
}
