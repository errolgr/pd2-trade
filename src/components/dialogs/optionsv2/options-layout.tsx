import React, { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DialogContent } from '@/components/ui/dialog';
import SettingsAppearancePage from '@/components/dialogs/optionsv2/appearance/layout';
import { useOptions } from '@/hooks/useOptions';

export const metadata = {
  title: 'Forms',
  description: 'Advanced form example using react-hook-form and Zod.',
};

interface INavItem {
  title: string;
  content: React.ReactNode;
}
const sidebarNavItems: INavItem[] = [
  {
    title: 'Appearance',
    content: <SettingsAppearancePage />,
  },
];

export default function SettingsLayout() {
  const [selectedItem, setSelectedItem] = useState<INavItem>(sidebarNavItems[0]);

  return (
    <DialogContent className="overflow-hidden p-0 md:max-h-[825px] md:max-w-[1000px] lg:max-w-[1200px]">
      <div className="hidden space-y-6 p-10 pb-16 md:block">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your meter settings and set preferences</p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:gap-x-12 lg:gap-y-0">
          <aside className="-mx-1 lg:w-1/5">
            <div className={'flex gap-x-2 lg:flex-col lg:gap-x-0 lg:gap-y-1'}>
              {sidebarNavItems.map((item) => (
                <Button
                  className={'justify-start'}
                  variant="ghost"
                  onClick={() => setSelectedItem(item)}
                  key={item.title}
                >
                  {item.title}
                </Button>
              ))}
            </div>
          </aside>
          <div className="flex-1 lg:max-w-2x">{selectedItem.content}</div>
        </div>
      </div>
    </DialogContent>
  );
}
