import type { Story, StoryDefault } from '@ladle/react';
import { PopoverKeyValue, PopoverSectionTitle, PopoverTile } from '@pd2-trader/ui';

export default { title: 'Overlay / PopoverParts' } satisfies StoryDefault;

export const Appraisal: Story = () => (
  <div className="flex w-72 flex-col gap-3 rounded-lg border bg-surface-elevated p-3 shadow-md">
    <PopoverSectionTitle aside="last 7 days">Market price</PopoverSectionTitle>
    <div className="grid grid-cols-3 gap-2">
      <PopoverTile label="Average"
        emphasis>
        3.80 HR
      </PopoverTile>
      <PopoverTile label="Low">2.90 HR</PopoverTile>
      <PopoverTile label="High">5.00 HR</PopoverTile>
    </div>
    <div className="space-y-1 border-t border-border pt-2 text-xs">
      <PopoverKeyValue label="Samples">84</PopoverKeyValue>
      <PopoverKeyValue label="Confidence">High</PopoverKeyValue>
      <PopoverKeyValue label="Top corruption">+1 skills, 20% FCR (truncated when it runs long)</PopoverKeyValue>
    </div>
    <PopoverSectionTitle>Top corruptions</PopoverSectionTitle>
  </div>
);
