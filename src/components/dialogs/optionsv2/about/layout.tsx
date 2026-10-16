import React from 'react';
import { SettingsSection } from '../settings-ui';
import { AboutForm } from './about-form';

export default function SettingsAbout() {
  return (
    <SettingsSection title="About"
      description="Information about the application, its version, and the developer.">
      <AboutForm />
    </SettingsSection>
  );
}
