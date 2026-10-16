import React from 'react';
import { SettingsSection } from '../settings-ui';
import { InterfaceForm } from './interface-form';

export default function SettingsInterface() {
  return (
    <SettingsSection title="Interface"
      description="Configure interface and overlay settings.">
      <InterfaceForm />
    </SettingsSection>
  );
}
