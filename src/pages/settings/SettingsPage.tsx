import * as React from "react";
import {OptionsDialog, OptionsProvider} from "@/hooks/useOptions";
import SettingsLayout from "@/components/dialogs/optionsv2/options-layout";


export const SettingsPage: React.FC = () => {
  return <OptionsProvider>
    <SettingsLayout />
  </OptionsProvider>
}