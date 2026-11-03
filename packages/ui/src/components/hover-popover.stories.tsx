import type { Story, StoryDefault } from '@ladle/react';
import { Badge, HoverPopover, PopoverKeyValue, PopoverSectionTitle, PopoverTile } from '@pd2-trader/ui';

export default { title: 'Overlay / HoverPopover' } satisfies StoryDefault;

export const Default: Story = () => (
  <div className="p-10">
    <HoverPopover
      className="w-64 p-3"
      content={
        <div className="flex flex-col gap-2">
          <PopoverSectionTitle aside="24 trades">Harlequin Crest</PopoverSectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <PopoverTile label="Average"
              emphasis>
              1.45 HR
            </PopoverTile>
            <PopoverTile label="Median">1.40 HR</PopoverTile>
          </div>
          <div className="space-y-1 border-t border-border pt-2 text-xs">
            <PopoverKeyValue label="Low">1.10 HR</PopoverKeyValue>
            <PopoverKeyValue label="High">2.00 HR</PopoverKeyValue>
          </div>
        </div>
      }
    >
      <Badge variant="outline">Hover for price</Badge>
    </HoverPopover>
  </div>
);
