import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ItemName,
  PopoverKeyValue,
  PopoverSectionTitle,
  PopoverTile,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Price preview',
  description: 'A read-only card on hover (opens after 150ms, closes 100ms after the pointer leaves). Works in the non-focusable overlay because it needs no keyboard focus.',
  order: 0,
};

export default function HoverCardPricePreviewExample() {
  return (
    <div className="rounded-lg border bg-surface p-4 text-sm">
      <HoverCard>
        <HoverCardTrigger asChild>
          <ItemName name="Harlequin Crest"
            quality="unique"
            className="cursor-help" />
        </HoverCardTrigger>
        <HoverCardContent className="flex flex-col gap-2">
          <PopoverSectionTitle aside="24 trades">Market price</PopoverSectionTitle>
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
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
