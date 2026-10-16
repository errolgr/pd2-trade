import { Separator } from '@/components/ui/separator';
import React from 'react';
import { NetWorthForm } from './networth-form';

export default function SettingsNetWorth() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Net Worth</h3>
        <p className="text-sm text-muted-foreground">
          Track your stash value over time and show it in an overlay while you play.
        </p>
      </div>
      <Separator />
      <NetWorthForm />
    </div>
  );
}
