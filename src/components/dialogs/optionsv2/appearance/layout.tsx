import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { GeneralForm } from './general-form';

export default function SettingGenereal() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.general.title')}
      description={t('sections.general.description')}>
      <GeneralForm />
    </SettingsSection>
  );
}
