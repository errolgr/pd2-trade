import React from 'react';
import { SettingsSection } from '../settings-ui';
import { InterfaceForm } from './interface-form';
import { ThemePicker } from './theme-picker';

export default function SettingsInterface() {
  return (
    <div className="flex flex-col gap-y-10">
      <SettingsSection title="Interface"
        description="Configure interface and overlay settings.">
        <InterfaceForm />
      </SettingsSection>
      <SettingsSection title="Theme"
        description="Color theme for every overlay window. Applies instantly.">
        <ThemePicker />
      </SettingsSection>
    </div>
  );
}
