import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@pd2-trader/ui';
import { Archive, Handshake, MoreHorizontal, Plus, Settings, Store, Tag } from 'lucide-react';
import { useState } from 'react';

export const meta = {
  title: 'Split panel with icon collapse',
  description: 'Left sidebar that collapses to an icon rail (`collapsible="icon"`): groups with a label and action, active row, badge, hover action, a nested stash list and a footer. Click the trigger or the rail edge to collapse; collapsed rows show their label as a tooltip.',
  order: 0,
};

const NAV = [
  { id: 'market', label: 'Market', icon: Store },
  { id: 'listings', label: 'My listings', icon: Tag, badge: 12 },
  { id: 'offers', label: 'Offers', icon: Handshake, badge: 3 },
];

const STASH_TABS = ['Personal', 'Shared 1', 'Shared 2', 'Shared 3'];

export default function SidebarSplitPanelExample() {
  const [page, setPage] = useState('market');
  return (
    <div className="h-96 w-full max-w-3xl overflow-hidden rounded-lg border bg-surface">
      <SidebarProvider className="h-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg"
                  tooltip="Hell ladder · softcore">
                  <Store />
                  <span className="flex flex-col">
                    <span className="font-semibold">Trade hub</span>
                    <span className="text-2xs text-muted-foreground">Hell ladder · softcore</span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Trade</SidebarGroupLabel>
              <SidebarGroupAction aria-label="New listing">
                <Plus />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton isActive={page === item.id}
                        tooltip={item.label}
                        onClick={() => setPage(item.id)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.badge !== undefined && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Stash</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Stash tabs">
                      <Archive />
                      <span>Stash tabs</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover
                      aria-label="Stash options">
                      <MoreHorizontal />
                    </SidebarMenuAction>
                    <SidebarMenuSub>
                      {STASH_TABS.map((tab) => (
                        <SidebarMenuSubItem key={tab}>
                          <SidebarMenuSubButton href="#"
                            isActive={page === tab}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(tab);
                            }}>
                            <span>{tab}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm"
                  tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <div className="flex h-10 items-center gap-2 border-b px-2.5">
            <SidebarTrigger />
            <span className="text-sm font-semibold tracking-tight">{NAV.find((n) => n.id === page)?.label ?? page}</span>
          </div>
          <p className="p-3 text-xs text-muted-foreground">Harlequin Crest · 14 listings · lowest 2.5 HR</p>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
