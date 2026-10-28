import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { AboutForm } from './about-form';

export default function SettingsAbout() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.about.title')}
      description={t('sections.about.description')}>
      <AboutForm />
    </SettingsSection>
  );
}
