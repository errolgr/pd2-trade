import React from 'react';
import { SettingsSection } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import { PluginsForm } from './plugins-form';

export default function SettingsPlugins() {
  const { t } = useTranslation('plugins');
  return (
    <SettingsSection title={t('settings.title')}
      description={t('settings.description')}>
      <PluginsForm />
    </SettingsSection>
  );
}
