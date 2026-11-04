import { useState } from 'react';
import { Copy, Search, Tag, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ItemName,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Item actions',
  description: 'Right-click (long-press on touch) an area to open its menu at the pointer. Same parts and look as DropdownMenu: items with shortcuts, a submenu, checkbox and radio items, a destructive item.',
  order: 0,
};

export default function ContextMenuStashItemExample() {
  const [pinned, setPinned] = useState(false);
  const [currency, setCurrency] = useState('hr');
  return (
    <div className="rounded-lg border bg-surface p-4">
      <ContextMenu>
        <ContextMenuTrigger className="flex h-28 w-60 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm">
          <ItemName name="Harlequin Crest"
            quality="unique" />
          <span className="text-xs text-muted-foreground">Right-click for actions</span>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Harlequin Crest</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem>
              <Search /> Price check <ContextMenuShortcut>Ctrl D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Copy /> Copy item text
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Tag /> List for
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent>
                  <ContextMenuItem>1 HR</ContextMenuItem>
                  <ContextMenuItem>1.5 HR</ContextMenuItem>
                  <ContextMenuItem inset>Custom price…</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={pinned}
            onCheckedChange={setPinned}>
            Pin to watchlist
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuLabel inset>Show prices in</ContextMenuLabel>
          <ContextMenuRadioGroup value={currency}
            onValueChange={setCurrency}>
            <ContextMenuRadioItem value="hr">High runes</ContextMenuRadioItem>
            <ContextMenuRadioItem value="gold">Gold</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">
            <Trash2 /> Delist
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
