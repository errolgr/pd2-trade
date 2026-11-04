import { HoverCard, HoverCardContent, HoverCardTrigger, ItemName, StatLine } from '@pd2-trader/ui';

export const meta = {
  title: 'Bare item tooltip',
  description: '`variant="bare"` drops the card chrome for content that brings its own (item tooltips). `side` and `align` place it like any popper; click handlers go on the trigger child.',
  order: 1,
};

export default function HoverCardItemTooltipExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex size-16 cursor-default items-center justify-center rounded-md border bg-muted/40 text-2xs text-muted-foreground">
            Shako
          </div>
        </HoverCardTrigger>
        <HoverCardContent variant="bare"
          side="right">
          <div className="flex w-60 flex-col items-center gap-0.5 rounded-lg border border-border bg-popover p-3 text-center text-xs shadow-panel">
            <ItemName name="Harlequin Crest"
              quality="unique"
              className="text-sm font-semibold" />
            <ItemName name="Shako"
              quality="unique" />
            <span className="text-muted-foreground">Defense: 141</span>
            <StatLine>+2 to All Skills</StatLine>
            <StatLine range={[1, 1.5]}
              value={1.5}>
              +1.5 to Life (Based on Character Level)
            </StatLine>
            <StatLine>Damage Reduced by 10%</StatLine>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
