import React from 'react';
import { SettingsSection } from '../settings-ui';
import { GeneralForm } from './general-form';
import { ThemePicker } from './theme-picker';

export default function SettingGenereal() {
  return (
    <div className="flex flex-col gap-y-10">
      <SettingsSection title="General"
        description="General settings for the application.">
        <GeneralForm />
      </SettingsSection>
      <SettingsSection title="Theme"
        description="Color theme for every overlay window. Applies instantly.">
        <ThemePicker />
      </SettingsSection>
    </div>
  );
}
