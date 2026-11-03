import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@pd2-trader/ui';

export default { title: 'Primitives / DropdownMenu' } satisfies StoryDefault;

export const Open: Story = () => {
  const [ladder, setLadder] = useState(true);
  const [sort, setSort] = useState('price');
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"
          size="icon-sm"
          aria-label="Listing actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start"
        className="w-55">
        <DropdownMenuLabel>Listing</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Copy /> Copy trade message <DropdownMenuShortcut>Ctrl C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Bump (cooldown)</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to stash tab</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Shared 1</DropdownMenuItem>
              <DropdownMenuItem>Shared 2</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={ladder}
          onCheckedChange={setLadder}>
          Ladder only
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sort}
          onValueChange={setSort}>
          <DropdownMenuRadioItem value="price">Sort by price</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="date">Sort by date</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 /> Delist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
