import { Separator } from '@/components/ui/separator';
import React from 'react';
import { GeneralForm } from '@/components/dialogs/optionsv2/appearance/general-form';

export default function SettingGenereal() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
          General settings for the application.
        </p>
      </div>
      <Separator />
      <GeneralForm />
    </div>
  );
}
