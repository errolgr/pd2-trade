import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { InterfaceForm } from './interface-form';
import { ThemePicker } from './theme-picker';

export default function SettingsInterface() {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col gap-y-10">
      <SettingsSection title={t('sections.interface.title')}
        description={t('sections.interface.description')}>
        <InterfaceForm />
      </SettingsSection>
      <SettingsSection title={t('sections.theme.title')}
        description={t('sections.theme.description')}>
        <ThemePicker />
      </SettingsSection>
    </div>
  );
}
