import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { StatsForm } from './stats-form';

export default function SettingsStats() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.stats.title')}
      description={t('sections.stats.description')}>
      <StatsForm />
    </SettingsSection>
  );
}
