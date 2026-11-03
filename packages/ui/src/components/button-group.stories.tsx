import type { Story, StoryDefault } from '@ladle/react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { Button, ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@pd2-trader/ui';

export default { title: 'Primitives / ButtonGroup' } satisfies StoryDefault;

export const Horizontal: Story = () => (
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

export const Vertical: Story = () => (
  <div className="w-fit rounded-lg border bg-surface p-4">
    <ButtonGroup orientation="vertical">
      <Button variant="outline"
        size="sm">
        Bump
      </Button>
      <Button variant="outline"
        size="sm">
        Edit price
      </Button>
      <Button variant="outline"
        size="sm">
        Delist
      </Button>
    </ButtonGroup>
  </div>
);
