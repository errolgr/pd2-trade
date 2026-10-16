import React from 'react';
import { SettingsSection } from '../settings-ui';
import { NetWorthForm } from './networth-form';

export default function SettingsNetWorth() {
  return (
    <SettingsSection title="Net Worth"
      description="Track your stash value over time and show it in an overlay while you play.">
      <NetWorthForm />
    </SettingsSection>
  );
}
