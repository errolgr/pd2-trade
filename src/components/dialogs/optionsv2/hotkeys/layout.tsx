import React from 'react';
import { SettingsSection } from '../settings-ui';
import { HotkeyForm } from './hotkey-form';

export default function SettingsHotkeys() {
  return (
    <SettingsSection title="Hotkeys"
      description="Configure your hotkey preferences here.">
      <HotkeyForm />
    </SettingsSection>
  );
}
