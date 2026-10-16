import React from 'react';
import { SettingsSection } from '../settings-ui';
import { GeneralForm } from './general-form';

export default function SettingGenereal() {
  return (
    <SettingsSection title="General"
      description="General settings for the application.">
      <GeneralForm />
    </SettingsSection>
  );
}
