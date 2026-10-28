import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { AccountForm } from './account-form';

export default function SettingsAccount() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.account.title')}
      description={t('sections.account.description')}>
      <AccountForm />
    </SettingsSection>
  );
}
