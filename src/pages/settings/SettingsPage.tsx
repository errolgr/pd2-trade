import * as React from "react";
import {OptionsDialog, OptionsProvider} from "@/hooks/useOptions";
import SettingsLayout from "@/components/dialogs/optionsv2/options-layout";
import { Pd2WebsiteProvider } from "@/hooks/pd2website/usePD2Website";


export const SettingsPage: React.FC = () => {
  return <OptionsProvider>
      <Pd2WebsiteProvider>
        <SettingsLayout />
      </Pd2WebsiteProvider>
  </OptionsProvider>
}