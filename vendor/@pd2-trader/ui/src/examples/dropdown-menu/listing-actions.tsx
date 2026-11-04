import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Action menu',
  description: 'Row actions behind an icon button: label, grouped items with shortcuts, a disabled item, a submenu (portalled so it is never clipped) and a destructive item last.',
  order: 0,
};

export default function DropdownMenuListingActionsExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"
            size="icon-sm"
            aria-label="Listing actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start"
          className="w-55">
          <DropdownMenuLabel>Shako listing</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Copy /> Copy trade message <DropdownMenuShortcut>Ctrl C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil /> Edit price
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Bump (cooldown)</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Move to stash tab</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Shared 1</DropdownMenuItem>
                  <DropdownMenuItem>Shared 2</DropdownMenuItem>
                  <DropdownMenuItem>Shared 3</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 /> Delist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
