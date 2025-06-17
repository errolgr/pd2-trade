import { Separator } from '@/components/ui/separator';
import React from 'react';
import { AppearanceForm } from '@/components/dialogs/optionsv2/appearance/appearance-form';

export default function SettingsAppearancePage() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the app. Automatically switch between day and night themes.
        </p>
      </div>
      <Separator />
      <AppearanceForm />
    </div>
  );
}
