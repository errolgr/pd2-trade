import type { Story, StoryDefault } from '@ladle/react';
import { Info } from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@pd2-trader/ui';

export default { title: 'Primitives / Tooltip' } satisfies StoryDefault;

export const Open: Story = () => (
  <div className="flex w-fit gap-16 p-10">
    <Tooltip defaultOpen>
      <TooltipTrigger asChild>
        <Button variant="outline"
          size="icon-sm"
          aria-label="Price info">
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Median of 24 trades in the last 7 days</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost"
          size="sm">
          Hover me
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Ctrl+D price-checks the hovered item</TooltipContent>
    </Tooltip>
  </div>
);
