import { Button, ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@pd2-trader/ui';

import { ChevronDown, Minus, Plus } from 'lucide-react';

export const meta = {
  title: 'Horizontal',
  description: 'Attached segments, a `ButtonGroupText` label in front of steppers, and a split button separated by `ButtonGroupSeparator`.',
  order: 0,
};

export default function HorizontalExample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
      <ButtonGroup>
        <Button variant="outline"
          size="sm">
          Uniques
        </Button>
        <Button variant="outline"
          size="sm">
          Sets
        </Button>
        <Button variant="outline"
          size="sm">
          Runewords
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText>Qty</ButtonGroupText>
        <Button variant="outline"
          size="icon-sm"
          aria-label="Less">
          <Minus />
        </Button>
        <Button variant="outline"
          size="icon-sm"
          aria-label="More">
          <Plus />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button size="sm">List item</Button>
        <ButtonGroupSeparator />
        <Button size="icon-sm"
          aria-label="More list options">
          <ChevronDown />
        </Button>
      </ButtonGroup>
    </div>
  );
}
