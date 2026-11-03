import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { NetWorthForm } from './networth-form';

export default function SettingsNetWorth() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.networth.title')}
      description={t('sections.networth.description')}>
      <NetWorthForm />
    </SettingsSection>
  );
}
