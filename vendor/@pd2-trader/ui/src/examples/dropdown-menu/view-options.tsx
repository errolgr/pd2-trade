import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Checkbox and radio items',
  description: 'Toggles (`DropdownMenuCheckboxItem`) and a single choice (`DropdownMenuRadioGroup`) for view options; the menu stays a menu, settings that need a form go in a Popover.',
  order: 1,
};

export default function DropdownMenuViewOptionsExample() {
  const [ladder, setLadder] = useState(true);
  const [hardcore, setHardcore] = useState(false);
  const [sort, setSort] = useState('price');
  return (
    <div className="rounded-lg border bg-surface p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"
            size="sm">
            <SlidersHorizontal /> View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start"
          className="w-48">
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={ladder}
            onCheckedChange={setLadder}>
            Ladder only
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hardcore}
            onCheckedChange={setHardcore}>
            Hardcore
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort}
            onValueChange={setSort}>
            <DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="date">Date listed</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
