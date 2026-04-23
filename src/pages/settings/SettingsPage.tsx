import * as React from 'react';
import { OptionsProvider } from '@/hooks/useOptions';
import SettingsLayout from '@/components/dialogs/optionsv2/options-layout';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { DialogProvider } from '@/hooks/useDialog';
import { ItemsProvider } from '@/hooks/useItems';

export const SettingsPage: React.FC = () => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <ItemsProvider>
          <ChildPd2WebsiteProvider>
            <SettingsLayout />
          </ChildPd2WebsiteProvider>
        </ItemsProvider>
      </OptionsProvider>
    </DialogProvider>
  );
};
