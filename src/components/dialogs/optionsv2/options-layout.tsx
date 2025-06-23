import React, { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {Card} from "@/components/ui/card";
import {X} from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import SettingGenereal from './appearance/layout';
import SettingsHotkeys from './hotkeys/layout';
import SettingsAbout from './about/layout';
import SettingsAccount from './account/layout';

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
    title: 'General',
    content: <SettingGenereal />,
  },
  {
    title: 'Account',
    content: <SettingsAccount />,
  },
  {
    title: 'Hotkeys',
    content: <SettingsHotkeys />,
  },
  {
    title: 'About',
    content: <SettingsAbout />,
  }
];

export default function SettingsLayout() {
  const [selectedItem, setSelectedItem] = useState<INavItem>(sidebarNavItems[0]);

  return (
    <Card className="overflow-hidden p-0 bg-background">
      <div className="hidden space-y-6 p-10 md:block">

        <div className={'flex flex-row justify-between'}>
          <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your settings and set preferences</p>
        </div>

        <Button variant="ghost"
          size="icon"
          onClick={() => getCurrentWebviewWindow().close()}
          className="self-start">
          <X className="h-4 w-4" />
        </Button>
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
    </Card>
  );
}
