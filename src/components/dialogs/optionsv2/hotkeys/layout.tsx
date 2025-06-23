import { Separator } from '@/components/ui/separator';
import React from 'react';
import { HotkeyForm } from './hotkey-form';

export default function SettingsHotkeys() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Hotkeys</h3>
        <p className="text-sm text-muted-foreground">
          Configure your hotkey preferences here.
        </p>
      </div>
      <Separator />
      <HotkeyForm />
    </div>
  );
} 