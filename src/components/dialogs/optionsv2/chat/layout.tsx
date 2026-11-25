import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { DiscordDmSettings } from '../discord/discord-dm-settings';
import { ChatForm } from './chat-form';

/** Chat & notifications: chat and whisper alerts, message templates, then Discord DMs. */
export default function SettingsChat() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.chat.title')}
      description={t('sections.chat.description')}>
      <ChatForm />
      <DiscordDmSettings />
    </SettingsSection>
  );
}
