import * as React from "react";
import {OptionsProvider} from "@/hooks/useOptions";
import SettingsLayout from "@/components/dialogs/optionsv2/options-layout";
import { Pd2WebsiteProvider } from "@/hooks/pd2website/usePD2Website";
import { DialogProvider } from "@/hooks/useDialog";


export const SettingsPage: React.FC = () => {
  return <DialogProvider>
    <OptionsProvider>
      <Pd2WebsiteProvider>
        <SettingsLayout />
      </Pd2WebsiteProvider>
  </OptionsProvider>
    </DialogProvider>
}