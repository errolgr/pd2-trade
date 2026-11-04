import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  useSidebar,
} from '@pd2-trader/ui';
import { Filter } from 'lucide-react';
import { useState } from 'react';

export const meta = {
  title: 'Controlled, right side, off-canvas',
  description: 'The caller owns `open` (store it if you want it remembered) and the filter column slides fully away on the right. `useSidebar()` gives any child the state and `toggleSidebar` (wire host hotkeys to it); `SidebarMenuSkeleton` fills a loading group.',
  order: 1,
};

const RUNES = ['Ber', 'Jah', 'Sur', 'Lo', 'Ohm', 'Vex'];

function FilterToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <Button variant="outline"
      size="sm"
      aria-pressed={open}
      onClick={toggleSidebar}>
      <Filter /> {open ? 'Hide filters' : 'Show filters'}
    </Button>
  );
}

export default function SidebarControlledRightExample() {
  const [open, setOpen] = useState(true);
  const [rune, setRune] = useState('Ber');
  return (
    <div className="h-96 w-full max-w-3xl overflow-hidden rounded-lg border bg-surface">
      <SidebarProvider open={open}
        onOpenChange={setOpen}
        className="h-full">
        <SidebarInset>
          <div className="flex h-10 items-center justify-between border-b px-2.5">
            <span className="text-sm font-semibold tracking-tight">{rune} rune listings</span>
            <FilterToggle />
          </div>
          <p className="p-3 text-xs text-muted-foreground">Filters are {open ? 'open' : 'closed'}.</p>
        </SidebarInset>
        <Sidebar side="right">
          <SidebarHeader className="text-sm font-semibold tracking-tight">Filters</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>High runes</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {RUNES.map((r) => (
                    <SidebarMenuItem key={r}>
                      <SidebarMenuButton size="sm"
                        isActive={rune === r}
                        onClick={() => setRune(r)}>
                        <span>{r}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Bases</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
}
