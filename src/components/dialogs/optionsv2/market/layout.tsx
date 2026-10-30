import React from 'react';
import { SettingsSection } from '../settings-ui';
import { useTranslation } from '@/i18n';
import { MarketForm } from './market-form';

export default function SettingsMarket() {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection title={t('sections.market.title')}
      description={t('sections.market.description')}>
      <MarketForm />
    </SettingsSection>
  );
}
