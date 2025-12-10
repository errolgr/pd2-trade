import { Separator } from '@/components/ui/separator';
import React from 'react';
import { InterfaceForm } from './interface-form';

export default function SettingsInterface() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Interface</h3>
        <p className="text-sm text-muted-foreground">
          Configure interface and overlay settings.
        </p>
      </div>
      <Separator />
      <InterfaceForm />
    </div>
  );
}

