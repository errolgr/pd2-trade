import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@pd2-trader/ui';
import { BarChart3, KeyRound, Users } from 'lucide-react';

export const meta = {
  title: 'Narrow layout (sheet)',
  description: 'Below 768px, or with `isMobile` on the provider (a narrow overlay panel), the sidebar renders inside a Sheet that the trigger opens. Inside an overlay panel the sheet stays within the panel.',
  order: 2,
};

const ADMIN = [
  { label: 'Users', icon: Users },
  { label: 'API keys', icon: KeyRound },
  { label: 'Price jobs', icon: BarChart3 },
];

export default function SidebarNarrowSheetExample() {
  return (
    <div className="h-64 w-full max-w-sidebar overflow-hidden rounded-lg border bg-surface">
      <SidebarProvider isMobile
        className="h-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN.map((item, i) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton isActive={i === 0}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="flex h-10 items-center gap-2 border-b px-2.5">
            <SidebarTrigger />
            <span className="text-sm font-semibold tracking-tight">Users</span>
          </div>
          <p className="p-3 text-xs text-muted-foreground">1,204 accounts · 37 online</p>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
