import { Separator } from '@/components/ui/separator';
import React from 'react';
import { GeneralForm } from '@/components/dialogs/optionsv2/appearance/general-form';
import {AboutForm} from "@/components/dialogs/optionsv2/about/about-form";

export default function SettingsAbout() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">About</h3>
        <p className="text-sm text-muted-foreground">
          Information about the application, its version, and the developer.
        </p>
      </div>
      <Separator />
      <AboutForm />
    </div>
  );
}
