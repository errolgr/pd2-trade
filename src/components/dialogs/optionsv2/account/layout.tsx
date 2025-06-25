import { Separator } from '@/components/ui/separator';
import React from 'react';
import { AccountForm } from './account-form';

export default function SettingsAccount() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings here.
        </p>
      </div>
      <Separator />
      <AccountForm />
    </div>
  );
} 