import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { ChatForm } from './chat-form';

export default function SettingsChat() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.chat.title')}
      description={t('sections.chat.description')}>
      <ChatForm />
    </SettingsSection>
  );
}
