import { PopoverKeyValue, PopoverSectionTitle, PopoverTile } from '@pd2-trader/ui';

export const meta = {
  title: 'Market appraisal',
  description: 'Tiles for headline numbers (`emphasis` on the main one), key-value rows (long values truncate) and section titles with an aside.',
  order: 0,
};

export default function PopoverPartsAppraisalExample() {
  return (
    <div className="flex w-72 flex-col gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-panel">
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
    </div>
  );
}
