import React from 'react';
import { SettingsSection } from '../settings-ui';
import { StatsForm } from './stats-form';

export default function SettingsStats() {
  return (
    <SettingsSection title="Price Check"
      description="Configure the price window and how stat ranges and filters are populated for price-check searches.">
      <StatsForm />
    </SettingsSection>
  );
}
