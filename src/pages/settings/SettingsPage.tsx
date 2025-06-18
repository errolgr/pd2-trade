import SettingsLayout from "@/components/dialogs/optionsv2/options-layout";
import * as React from "react";
import {OptionsDialog, OptionsProvider} from "@/hooks/useOptions";


export const SettingsPage: React.FC = () => {
  return <OptionsProvider>
    <SettingsLayout />
  </OptionsProvider>
}