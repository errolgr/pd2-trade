import React from 'react';
import { SettingsSection } from '../settings-ui';
import { DiscordDmSettings } from './discord-dm-settings';

export default function SettingsDiscord() {
  return (
    <SettingsSection
      title="Discord"
      description="DMs from the PD2 Trader bot about whispers, offers and messages while you are away."
    >
      <DiscordDmSettings />
    </SettingsSection>
  );
}
