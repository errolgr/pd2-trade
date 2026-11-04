import { Button, Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@pd2-trader/ui';
import { BellRing, Puzzle, ShieldCheck } from 'lucide-react';

export const meta = {
  title: 'Variants',
  description:
    '`default` (no frame) inside a list, `outline` for a standalone row on a panel, `muted` for a quiet callout. Media, title + description and actions line up the same in each.',
  order: 0,
};

export default function ItemVariantsExample() {
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
      <Item>
        <ItemMedia variant="icon">
          <Puzzle />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Price check plugin</ItemTitle>
          <ItemDescription>Shows the last 30 days of trades for the hovered item.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline"
            size="sm">
            Configure
          </Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <ShieldCheck />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Account linked</ItemTitle>
          <ItemDescription>Sorc_Errol · softcore ladder</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost"
            size="sm">
            Unlink
          </Button>
        </ItemActions>
      </Item>
      <Item variant="muted"
        size="sm">
        <ItemMedia>
          <BellRing className="size-4 text-muted-foreground" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Ber Rune dropped below 1 HR</ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button variant="quiet"
            size="inline">
            Dismiss
          </Button>
        </ItemActions>
      </Item>
    </div>
  );
}
