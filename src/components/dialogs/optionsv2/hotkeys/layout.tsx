import React from 'react';
import { SettingsSection } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import { HotkeyForm } from './hotkey-form';

export default function SettingsHotkeys() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.hotkeys.title')}
      description={t('sections.hotkeys.description')}>
      <HotkeyForm />
    </SettingsSection>
  );
}
