import { Separator } from '@/components/ui/separator';
import React from 'react';
import { StatsForm } from './stats-form';

export default function SettingsStats() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Price Check</h3>
        <p className="text-sm text-muted-foreground">
          Configure how stat ranges and filters are populated for price-check searches.
        </p>
      </div>
      <Separator />
      <StatsForm />
    </div>
  );
}
