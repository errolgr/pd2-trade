import React, { useState, useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GripVertical, X } from 'lucide-react';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import SettingGenereal from './appearance/layout';
import SettingsHotkeys from './hotkeys/layout';
import SettingsAbout from './about/layout';
import SettingsAccount from './account/layout';
import SettingsChat from './chat/layout';
import SettingsInterface from './interface/layout';

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
    title: 'Chat',
    content: <SettingsChat />,
  },
  {
    title: 'Interface',
    content: <SettingsInterface />,
  },
  {
    title: 'Hotkeys',
    content: <SettingsHotkeys />,
  },
  {
    title: 'About',
    content: <SettingsAbout />,
  },
];

export default function SettingsLayout() {
  const [selectedItem, setSelectedItem] = useState<INavItem>(sidebarNavItems[0]);

  return (
    <Card className="h-screen w-full overflow-hidden p-0 bg-background flex flex-col">
      <div className="hidden md:flex flex-col flex-1 min-h-0 p-10">
        <div className="flex justify-between flex-shrink-0">
          <div className={'flex flex-row justify-between'}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <GripVertical
                  data-tauri-drag-region
                  className="h-5 w-5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                  id="titlebar-drag-handle"
                />
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
              </div>
              <p className="text-muted-foreground">Manage your settings and set preferences</p>
            </div>
          </div>

          <Button variant="ghost"
            size="icon"
            onClick={() => getCurrentWebviewWindow().hide()}
            className="self-start">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="my-6" />
        <div className="flex flex-1 min-h-0 lg:gap-x-12">
          <aside className="-mx-1 lg:w-1/5 flex-shrink-0">
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
          <ScrollArea className="flex-1 min-h-0">{selectedItem.content}</ScrollArea>
        </div>
      </div>
    </Card>
  );
}
