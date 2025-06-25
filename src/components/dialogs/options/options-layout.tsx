import React from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { OptionsSidebar } from './options-sidebar';

interface OptionsLayoutProps {
  children: React.ReactNode;
}

export const OptionsLayout: React.FC<OptionsLayoutProps> = ({ children }: any) => {
  return (
    <DialogContent className="overflow-hidden p-0 md:max-h-[825px] md:max-w-[1000px] lg:max-w-[1200px]">
      <SidebarProvider>
        <OptionsSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className={'h-4'}>
              <Separator orientation="vertical"
                className="mr-2 h-4" />
            </div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">link</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>page</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </DialogContent>
  );
};
