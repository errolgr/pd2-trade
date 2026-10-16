import React from 'react';
import { SettingsSection } from '../settings-ui';
import { AccountForm } from './account-form';

export default function SettingsAccount() {
  return (
    <SettingsSection title="Account"
      description="Manage your account settings here.">
      <AccountForm />
    </SettingsSection>
  );
}
